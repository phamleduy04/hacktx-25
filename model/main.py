from convex import ConvexClient
import os
import dotenv
import joblib
import pandas as pd
from typing import Dict, Any
dotenv.load_dotenv("../.env.local")

CONVEX_URL = os.getenv("VITE_CONVEX_URL")

client = ConvexClient(CONVEX_URL)

# Global variables for model and preprocessor
model = None
preprocessor = None

def load_models():
    """Load the trained model and preprocessor at startup."""
    global model, preprocessor
    
    # Try to find model files in different locations
    possible_paths = [
        ('f1_pit_strategy_model.joblib', 'preprocessor.joblib'),
        ('output/f1_pit_strategy_model.joblib', 'output/preprocessor.joblib')
    ]
    
    model_path = None
    preprocessor_path = None
    
    for mp, pp in possible_paths:
        if os.path.exists(mp) and os.path.exists(pp):
            model_path = mp
            preprocessor_path = pp
            break
    
    if model_path is None or preprocessor_path is None:
        raise FileNotFoundError(
            "Model files not found. Searched in:\n" +
            "\n".join([f"  - {mp} and {pp}" for mp, pp in possible_paths]) +
            "\n\nPlease run train.py first to generate the model."
        )
    
    model = joblib.load(model_path)
    preprocessor = joblib.load(preprocessor_path)
    print(f"✓ Model loaded from: {model_path}")
    print(f"✓ Preprocessor loaded from: {preprocessor_path}")


def check_input_realism(data: Dict[str, Any]) -> list[str]:
    """
    Checks if input combinations are realistic based on training data patterns.
    
    Args:
        data: Dictionary containing input parameters
        
    Returns:
        List of warning messages (empty if no issues)
    """
    warnings = []
    
    tire_wear = float(data.get('tire_wear_percentage', 0))
    perf_drop = float(data.get('performance_drop_seconds', 0))
    
    # Check if performance drop is realistic for the given tire wear
    # Based on training data: perf_drop roughly scales with tire_wear^1.5
    expected_max_drop = 4.5 * (tire_wear / 100)**1.5 + 1.5  # with variance buffer
    expected_min_drop = max(0.1, 4.5 * (tire_wear / 100)**1.5 - 0.5)
    
    if perf_drop > expected_max_drop:
        warnings.append(
            f"Performance drop ({perf_drop}s) seems unusually high for {tire_wear}% tire wear. "
            f"Expected range: {expected_min_drop:.2f}s - {expected_max_drop:.2f}s. "
            "Prediction may be unreliable."
        )
    elif perf_drop < expected_min_drop and tire_wear > 30:
        warnings.append(
            f"Performance drop ({perf_drop}s) seems unusually low for {tire_wear}% tire wear. "
            f"Expected range: {expected_min_drop:.2f}s - {expected_max_drop:.2f}s. "
            "Prediction may be unreliable."
        )
    
    return warnings


def validate_input(data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validates the input data for the prediction endpoint.
    
    Args:
        data: Dictionary containing input parameters
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = [
        'undercut_overcut_opportunity',
        'tire_wear_percentage',
        'performance_drop_seconds',
        'track_position',
        'race_incident',
        'laps_since_pit'
    ]
    
    # Check if all required fields are present
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    # Validate undercut_overcut_opportunity (binary: 0 or 1)
    if data['undercut_overcut_opportunity'] not in [0, 1, True, False]:
        return False, "undercut_overcut_opportunity must be 0 or 1"
    
    # Validate tire_wear_percentage (0-100)
    try:
        tire_wear = float(data['tire_wear_percentage'])
        if not (0 <= tire_wear <= 100):
            return False, "tire_wear_percentage must be between 0 and 100"
    except (ValueError, TypeError):
        return False, "tire_wear_percentage must be a number"
    
    # Validate performance_drop_seconds (positive number)
    try:
        perf_drop = float(data['performance_drop_seconds'])
        if perf_drop < 0:
            return False, "performance_drop_seconds must be non-negative"
    except (ValueError, TypeError):
        return False, "performance_drop_seconds must be a number"
    
    # Validate track_position (1-20)
    try:
        position = int(data['track_position'])
        if not (1 <= position <= 20):
            return False, "track_position must be between 1 and 20"
    except (ValueError, TypeError):
        return False, "track_position must be an integer"
    
    # Validate race_incident (must be one of the known types)
    valid_incidents = ['None', 'Yellow Flag', 'Safety Car', 'VSC']
    if data['race_incident'] not in valid_incidents:
        return False, f"race_incident must be one of: {', '.join(valid_incidents)}"
    
    # Validate laps_since_pit (positive integer)
    try:
        laps = int(data['laps_since_pit'])
        if laps < 0:
            return False, "laps_since_pit must be non-negative"
    except (ValueError, TypeError):
        return False, "laps_since_pit must be an integer"
    
    return True, ""


def main():
    print("="*60)
    print("F1 PIT STRATEGY MODEL - CONVEX CLIENT")
    print("="*60)
    
    # Load models at startup
    try:
        load_models()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease run 'python train.py' first to train and save the model.")
        return
    
    print("\n📡 Subscribing to Convex f1:listF1CarData...")
    print("="*60 + "\n")
    
    # Track processed message IDs to avoid infinite loop
    processed_message_ids = set()
    
    for messages in client.subscribe("f1:listF1CarData"):
        for message in messages:
            # Skip if we've already processed this message
            message_id = message.get('_id')
            if message_id in processed_message_ids:
                continue
            
            # Mark as processed
            processed_message_ids.add(message_id)
            
            try:
                print(f"\n{'='*60}")
                print(f"Processing message: {message.get('car_id', 'Unknown')} (ID: {message_id})")
                print(f"{'='*60}")
                
                # Validate input
                is_valid, error_message = validate_input(message)
                if not is_valid:
                    print(f"❌ Validation Error: {error_message}")
                    continue
                
                # Check for unrealistic input combinations
                warnings = check_input_realism(message)
                if warnings:
                    print("\n⚠️  Warnings:")
                    for warning in warnings:
                        print(f"  - {warning}")
                
                # Prepare input DataFrame
                race_scenario = pd.DataFrame({
                    'undercut_overcut_opportunity': [int(message['undercut_overcut_opportunity'])],
                    'tire_wear_percentage': [float(message['tire_wear_percentage'])],
                    'performance_drop_seconds': [float(message['performance_drop_seconds'])],
                    'track_position': [int(message['track_position'])],
                    'race_incident': [message['race_incident']],
                    'laps_since_pit': [int(message['laps_since_pit'])]
                })
                
                # Preprocess and predict
                X_processed = preprocessor.transform(race_scenario)
                decision = model.predict(X_processed)[0]
                
                # Get prediction probabilities if available
                confidence = None
                probabilities_detail = None
                if hasattr(model, 'predict_proba'):
                    probabilities = model.predict_proba(X_processed)[0]
                    confidence = float(max(probabilities))
                    probabilities_detail = probabilities
                    
                # Debug: Print feature importances and predictions
                if hasattr(model, 'feature_importances_'):
                    print(f"\n🔍 Debug Info:")
                    print(f"  Model classes: {model.classes_}")
                    print(f"  Probabilities: PIT NOW={probabilities[0]:.2%}, STAY OUT={probabilities[1]:.2%}")
                    print(f"  Processed features shape: {X_processed.shape}")
                
                # Print results
                print("\n✅ Prediction Results:")
                print(f"  Decision: {decision}")
                if confidence is not None:
                    print(f"  Confidence: {confidence:.2%}")
                
                print("\n📊 Input Data:")
                print(f"  Car ID: {message.get('car_id', 'N/A')}")
                print(f"  Tire Wear: {message['tire_wear_percentage']:.1f}%")
                print(f"  Performance Drop: {message['performance_drop_seconds']:.2f}s")
                print(f"  Track Position: {message['track_position']}")
                print(f"  Race Incident: {message['race_incident']}")
                print(f"  Laps Since Pit: {message['laps_since_pit']}")
                print(f"  Undercut/Overcut Opportunity: {'Yes' if message['undercut_overcut_opportunity'] else 'No'}")

                # Set the pit strategy in Convex
                try:
                    client.mutation("f1Strategy:setF1PitStrategy", {
                        "car_id": message['car_id'],
                        "decision": decision
                    })
                    print(f"\n💾 Strategy saved to Convex for car {message['car_id']}")
                except Exception as mutation_error:
                    print(f"\n⚠️  Warning: Could not save strategy to Convex: {mutation_error}")
                
            except Exception as e:
                print(f"\n❌ Error processing message: {str(e)}")
                continue

if __name__ == "__main__":
    main()