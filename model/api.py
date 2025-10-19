"""
F1 Pit Strategy Model - Flask API Server

This API server provides a /predict endpoint for real-time pit stop decision recommendations
based on current race conditions.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from typing import Dict, Any

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

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
        'race_incident'
    ]
    
    # Check if all required fields are present
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    # Validate undercut_overcut_opportunity (binary: 0 or 1)
    if data['undercut_overcut_opportunity'] not in [0, 1]:
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
    
    return True, ""


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'preprocessor_loaded': preprocessor is not None
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict pit stop decision based on current race conditions.
    
    Expected JSON payload:
    {
        "undercut_overcut_opportunity": 0 or 1,
        "tire_wear_percentage": 0-100,
        "performance_drop_seconds": float,
        "track_position": 1-20,
        "race_incident": "None" | "Yellow Flag" | "Safety Car" | "VSC"
    }
    
    Returns:
    {
        "decision": "PIT NOW" or "STAY OUT",
        "confidence": float (if available),
        "input_data": {...}
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No JSON data provided',
                'status': 'error'
            }), 400
        
        # Validate input
        is_valid, error_message = validate_input(data)
        if not is_valid:
            return jsonify({
                'error': error_message,
                'status': 'error'
            }), 400
        
        # Check for unrealistic input combinations
        warnings = check_input_realism(data)
        
        # Prepare input DataFrame
        race_scenario = pd.DataFrame({
            'undercut_overcut_opportunity': [int(data['undercut_overcut_opportunity'])],
            'tire_wear_percentage': [float(data['tire_wear_percentage'])],
            'performance_drop_seconds': [float(data['performance_drop_seconds'])],
            'track_position': [int(data['track_position'])],
            'race_incident': [data['race_incident']]
        })
        
        # Preprocess and predict
        X_processed = preprocessor.transform(race_scenario)
        decision = model.predict(X_processed)[0]
        
        # Get prediction probabilities if available
        confidence = None
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(X_processed)[0]
            confidence = float(max(probabilities))
        
        # Prepare response
        response = {
            'status': 'success',
            'decision': decision,
            'input_data': data
        }
        
        if confidence is not None:
            response['confidence'] = round(confidence, 4)
        
        # Add warnings if any
        if warnings:
            response['warnings'] = warnings
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Prediction failed: {str(e)}',
            'status': 'error'
        }), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model."""
    try:
        info = {
            'model_type': type(model).__name__,
            'features': [
                'undercut_overcut_opportunity',
                'tire_wear_percentage',
                'performance_drop_seconds',
                'track_position',
                'race_incident'
            ],
            'possible_decisions': ['PIT NOW', 'STAY OUT'],
            'race_incident_options': ['None', 'Yellow Flag', 'Safety Car', 'VSC'],
            'strategy_notes': {
                'pit_stop_cost': '20-25 seconds lost on average',
                'critical_thresholds': {
                    'tire_wear': '> 85% (unsafe)',
                    'performance_drop': '> 3.5s per lap',
                    'strategic_window': 'Undercut opportunity + 40%+ wear + Top 8 position'
                },
                'safety_car_advantage': 'Near-free pit stop during Safety Car/VSC'
            }
        }
        
        if hasattr(model, 'max_depth'):
            info['max_depth'] = model.max_depth
        
        if hasattr(model, 'n_classes_'):
            info['n_classes'] = int(model.n_classes_)
        
        return jsonify(info), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get model info: {str(e)}',
            'status': 'error'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'error': 'Endpoint not found',
        'status': 'error'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        'error': 'Internal server error',
        'status': 'error'
    }), 500


def main():
    """Start the Flask API server."""
    print("="*60)
    print("F1 PIT STRATEGY MODEL - API SERVER")
    print("="*60)
    
    # Load models at startup
    try:
        load_models()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease run 'python train.py' first to train and save the model.")
        return
    
    print("\n📡 Starting API server...")
    print("\nAvailable endpoints:")
    print("  GET  /health       - Health check")
    print("  POST /predict      - Make pit stop decision prediction")
    print("  GET  /model-info   - Get model information")
    print("\n" + "="*60 + "\n")
    
    # Start Flask server
    app.run(host='0.0.0.0', port=3000, debug=True)


if __name__ == '__main__':
    main()

