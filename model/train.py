"""
F1 Pit Strategy Model Training Script

This script generates synthetic F1 racing data and trains a Decision Tree classifier
to predict optimal pit stop decisions based on race conditions.
"""

import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
from datetime import datetime
import fastf1

# Enable FastF1 cache
# fastf1.Cache.enable_cache('cache')


def fetch_real_f1_data(years=None, max_sessions=10):
    """
    Fetches real F1 data with ACTUAL pit stop decisions from races.
    Uses when drivers actually pitted vs stayed out, not synthetic labels.
    
    Args:
        years (list): List of years to fetch data from
        max_sessions (int): Maximum number of race sessions to fetch per year
        
    Returns:
        pd.DataFrame: Real F1 data with actual pit decisions
    """
    
    if years is None:
        years = [2023]
    
    print(f"Fetching real F1 data from {years}...")
    print("Using ACTUAL pit stop decisions from races (not synthetic labels)\n")
    all_data = []
    
    for year in years:
        print(f"\nProcessing {year} season...")
        try:
            schedule = fastf1.get_event_schedule(year)
            races = schedule[schedule['EventFormat'] != 'testing']
            
            session_count = 0
            for _, event in races.iterrows():
                if session_count >= max_sessions:
                    break
                
                try:
                    print(f"  Loading {event['EventName']}...", end=" ")
                    
                    # Load race session
                    session = fastf1.get_session(year, event['EventName'], 'R')
                    session.load()
                    
                    # Get laps data
                    laps = session.laps
                    
                    # Filter out invalid laps
                    laps = laps[laps['LapTime'].notna()]
                    laps = laps[laps['Position'].notna()]
                    
                    if len(laps) == 0:
                        print("No valid laps. Skipping.")
                        continue
                    
                    # Process each lap and determine if driver pitted
                    for idx, lap in laps.iterrows():
                        try:
                            driver = lap['Driver']
                            lap_number = lap['LapNumber']
                            current_stint = lap['Stint']
                            
                            # Skip first few laps (start of race)
                            if lap_number < 5:
                                continue
                            
                            # Get driver's laps
                            driver_laps = laps[laps['Driver'] == driver].sort_values('LapNumber')
                            
                            # ACTUAL DECISION: Did driver pit after this lap?
                            # Check if next lap is a new stint (indicates a pit stop happened)
                            next_lap = driver_laps[driver_laps['LapNumber'] == lap_number + 1]
                            
                            if len(next_lap) == 0:
                                # Last lap of race - skip
                                continue
                            
                            next_stint = next_lap.iloc[0]['Stint']
                            did_pit = next_stint != current_stint
                            
                            # Label based on ACTUAL decision
                            decision = 'PIT NOW' if did_pit else 'STAY OUT'
                            
                            # Calculate features
                            # 1. Performance drop (compared to best lap on this stint)
                            stint_laps = driver_laps[driver_laps['Stint'] == current_stint]
                            if len(stint_laps) >= 2:
                                current_lap_time = lap['LapTime'].total_seconds()
                                best_stint_time = stint_laps['LapTime'].min().total_seconds()
                                performance_drop = max(0, current_lap_time - best_stint_time)
                            else:
                                performance_drop = 0
                            
                            # 2. Tire wear (from stint progress)
                            stint_lap = lap['TyreLife'] if pd.notna(lap['TyreLife']) else 1
                            tire_wear = min(95, (stint_lap / 35.0) * 100)
                            
                            # 3. Track position
                            position = int(lap['Position']) if pd.notna(lap['Position']) else 10
                            
                            # 4. Laps since last pit (stint lap count)
                            laps_since_pit = int(stint_lap)
                            
                            # 5. Gap to car ahead (if available)
                            if pd.notna(lap.get('GapToLeader')):
                                gap_ahead = float(lap['GapToLeader'])
                            else:
                                gap_ahead = 0
                            
                            # 6. Race incident
                            lap_time = lap['Time']
                            track_status = session.track_status
                            incident = 'None'
                            
                            if track_status is not None and len(track_status) > 0:
                                status_at_lap = track_status[
                                    (track_status['Time'] >= lap_time - pd.Timedelta(seconds=5)) &
                                    (track_status['Time'] <= lap_time + pd.Timedelta(seconds=5))
                                ]
                                
                                if len(status_at_lap) > 0:
                                    status_code = str(status_at_lap.iloc[-1]['Status'])
                                    if status_code in ['4', '6']:
                                        incident = 'Safety Car'
                                    elif status_code == '5':
                                        incident = 'VSC'
                                    elif status_code in ['2', '7']:
                                        incident = 'Yellow Flag'
                            
                            # 7. Strategic window (fighting for position + mid-race)
                            in_strategic_window = 1 if (10 <= lap_number <= 45 and position <= 10) else 0
                            
                            all_data.append({
                                'undercut_overcut_opportunity': in_strategic_window,
                                'tire_wear_percentage': tire_wear,
                                'performance_drop_seconds': performance_drop,
                                'track_position': position,
                                'race_incident': incident,
                                'laps_since_pit': laps_since_pit,
                                'lap_number': lap_number,
                                'driver': driver,
                                'event': event['EventName'],
                                'decision': decision
                            })
                            
                        except Exception:
                            continue
                    
                    print(f"✓ ({len(laps)} laps processed)")
                    session_count += 1
                    
                except Exception as e:
                    print(f"✗ Error: {str(e)}")
                    continue
        
        except Exception as e:
            print(f"Error loading {year} schedule: {e}")
            continue
    
    if len(all_data) == 0:
        raise ValueError("No F1 data could be fetched. Check your internet connection or try synthetic data.")
    
    df = pd.DataFrame(all_data)
    print(f"\n✓ Successfully fetched {len(df)} laps from {len(df['event'].unique())} races")
    return df


def add_decision_labels(data):
    """
    Adds pit stop decision labels to the data based on racing strategy logic.
    
    Args:
        data (pd.DataFrame): Data with features
        
    Returns:
        pd.DataFrame: Data with 'decision' column added
    """
    decisions = []
    for _, row in data.iterrows():
        # Critical situations - MUST pit immediately
        if row['race_incident'] in ['Safety Car', 'VSC']:
            # Free pit stop opportunity during safety car
            decisions.append('PIT NOW')
        elif row['tire_wear_percentage'] > 85:
            # Critical tire degradation - unsafe to continue
            decisions.append('PIT NOW')
        elif row['performance_drop_seconds'] > 3.5:
            # Losing too much time per lap - must pit
            decisions.append('PIT NOW')
        
        # Strategic pit stops - only when it makes sense
        elif row['undercut_overcut_opportunity'] == 1 and row['tire_wear_percentage'] > 40 and row['track_position'] <= 8:
            # Undercut opportunity, but only if:
            # - In top 8 (fighting for position)
            # - Tires are already worn (>40%)
            decisions.append('PIT NOW')
        
        elif row['performance_drop_seconds'] > 2.5 and row['tire_wear_percentage'] > 65:
            # Significant performance loss + high tire wear
            decisions.append('PIT NOW')
        
        elif row['performance_drop_seconds'] > 2.0 and row['tire_wear_percentage'] > 75:
            # Moderate performance loss but very high tire wear
            decisions.append('PIT NOW')
        
        # Default: Stay out (pitting is expensive - lose 20-25 seconds)
        else:
            decisions.append('STAY OUT')
    
    data['decision'] = decisions
    return data


def generate_training_data(use_real_data=True, num_samples=2000):
    """
    Generates training data for the F1 pit strategy model.
    Tries to use real F1 data with ACTUAL pit decisions, falls back to synthetic data.
    
    Args:
        use_real_data (bool): Whether to attempt to fetch real F1 data
        num_samples (int): Number of synthetic samples if real data unavailable
        
    Returns:
        pd.DataFrame: Dataset with features and target decision labels
    """
    if use_real_data:
        try:
            print("Fetching real F1 data with ACTUAL pit stop decisions...")
            data = fetch_real_f1_data(years=[2024, 2023], max_sessions=8)
            
            # Real data already has 'decision' column from actual pit stops!
            print(f"\n✅ Using REAL pit decisions from actual races")
            print(f"Data distribution:\n{data['decision'].value_counts()}")
            print(f"Percentage that pitted: {(data['decision'] == 'PIT NOW').sum() / len(data) * 100:.1f}%\n")
            return data
            
        except Exception as e:
            print(f"\n⚠️  Failed to fetch real data: {e}")
            print("Falling back to synthetic data generation...")
    
    # Fall back to synthetic data
    return generate_training_data_synthetic(num_samples)


def generate_training_data_synthetic(num_samples=2000):
    """
    Generates a synthetic dataset for training the F1 pit strategy model.
    
    Args:
        num_samples (int): Number of training samples to generate
        
    Returns:
        pd.DataFrame: Dataset with features and target decision labels
    """
    print(f"Generating {num_samples} synthetic F1 scenario samples...")
    
    # Generate features
    undercut_overcut_opportunity = np.random.choice([0, 1], size=num_samples, p=[0.7, 0.3])
    tire_wear_percentage = np.random.randint(5, 98, size=num_samples)
    
    # Generate performance drop with correlation to tire wear but more variance
    # Base performance drop correlated with wear + random component
    base_drop = np.random.uniform(0.1, 4.5, size=num_samples) * (tire_wear_percentage / 100)**1.5
    random_component = np.random.uniform(-0.5, 1.5, size=num_samples)
    performance_drop_seconds = np.clip(base_drop + random_component, 0.1, 4.5)
    
    track_position = np.random.randint(1, 21, size=num_samples)
    race_incident = np.random.choice(
        ['None', 'Yellow Flag', 'Safety Car', 'VSC'],
        size=num_samples,
        p=[0.85, 0.08, 0.04, 0.03]
    )
    
    # Generate laps since pit (correlated with tire wear)
    laps_since_pit = np.round((tire_wear_percentage / 100) * 35).astype(int)
    laps_since_pit = np.clip(laps_since_pit, 1, 50)  # Between 1 and 50 laps

    data = pd.DataFrame({
        'undercut_overcut_opportunity': undercut_overcut_opportunity,
        'tire_wear_percentage': tire_wear_percentage,
        'performance_drop_seconds': performance_drop_seconds,
        'track_position': track_position,
        'race_incident': race_incident,
        'laps_since_pit': laps_since_pit
    })

    # Add decision labels using shared logic
    data = add_decision_labels(data)
    print(f"Data generation complete. Distribution:\n{data['decision'].value_counts()}")
    return data


def create_preprocessor():
    """
    Creates a preprocessing pipeline for transforming features.
    Handles both categorical and numerical features with proper scaling.
    
    Returns:
        ColumnTransformer: Preprocessing pipeline
    """
    categorical_features = ['race_incident']
    # Numerical features that should be scaled
    numerical_features = [
        'tire_wear_percentage',
        'performance_drop_seconds',
        'track_position',
        'laps_since_pit'
    ]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
            ('num', StandardScaler(), numerical_features)
        ],
        remainder='passthrough'  # Keep other features as-is
    )
    
    return preprocessor


def train_model(X_train, y_train, max_depth=5):
    """
    Trains a Decision Tree classifier for pit strategy prediction.
    Uses regularization to prevent overfitting.
    
    Args:
        X_train: Training features
        y_train: Training labels
        max_depth (int): Maximum depth of the decision tree
        
    Returns:
        DecisionTreeClassifier: Trained model
    """
    print(f"Training Decision Tree model with regularization...")
    print(f"  - max_depth={max_depth}")
    print(f"  - min_samples_split=50")
    print(f"  - min_samples_leaf=20")
    
    model = DecisionTreeClassifier(
        max_depth=max_depth,
        min_samples_split=50,  # Require at least 50 samples to split
        min_samples_leaf=20,   # Require at least 20 samples in leaf nodes
        random_state=42,
        class_weight='balanced'  # Handle class imbalance
    )
    model.fit(X_train, y_train)
    print("Model training complete.")
    return model


def evaluate_model(model, X_test, y_test):
    """
    Evaluates the trained model and prints performance metrics.
    
    Args:
        model: Trained classifier
        X_test: Test features
        y_test: Test labels
    """
    print("\n" + "="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nAccuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("="*60 + "\n")


def save_model(model, preprocessor, output_dir='output'):
    """
    Saves the trained model and preprocessor to disk.
    
    Args:
        model: Trained classifier
        preprocessor: Fitted preprocessing pipeline
        output_dir (str): Directory to save the output files
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Define file paths
    model_file = os.path.join(output_dir, 'f1_pit_strategy_model.joblib')
    preprocessor_file = os.path.join(output_dir, 'preprocessor.joblib')
    backup_file = os.path.join(output_dir, f'f1_model_{timestamp}.joblib')
    
    # Save model files
    joblib.dump(model, model_file)
    joblib.dump(preprocessor, preprocessor_file)
    joblib.dump(model, backup_file)
    
    print(f"✓ Model saved to: {model_file}")
    print(f"✓ Preprocessor saved to: {preprocessor_file}")
    print(f"✓ Backup saved: {backup_file}")


def main():
    """Main training pipeline."""
    print("\n" + "="*60)
    print("F1 PIT STRATEGY MODEL - TRAINING PIPELINE")
    print("="*60 + "\n")
    
    # 1. Generate training data (tries real F1 data first, falls back to synthetic)
    dataset = generate_training_data(use_real_data=True, num_samples=2000)
    
    # 2. Split features and target
    # Keep only the required features for the model
    required_features = [
        'undercut_overcut_opportunity',
        'tire_wear_percentage', 
        'performance_drop_seconds',
        'track_position',
        'race_incident',
        'laps_since_pit'  # New feature!
    ]
    
    X = dataset[required_features]
    y = dataset['decision']
    
    print(f"Class distribution in full dataset:")
    print(y.value_counts())
    print(f"  PIT NOW: {(y == 'PIT NOW').sum() / len(y) * 100:.1f}%")
    print(f"  STAY OUT: {(y == 'STAY OUT').sum() / len(y) * 100:.1f}%")
    
    # 3. Create preprocessor
    preprocessor = create_preprocessor()
    
    # 4. Split into train/test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nDataset split: {len(X_train)} training samples, {len(X_test)} test samples")
    
    # 5. Fit preprocessor and transform data
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # 6. Train model with regularization to prevent overfitting
    model = train_model(X_train_processed, y_train, max_depth=5)
    
    # 7. Evaluate model
    evaluate_model(model, X_test_processed, y_test)
    
    # 8. Save model and preprocessor
    save_model(model, preprocessor)
    
    print("\n✓ Training pipeline complete!\n")


if __name__ == '__main__':
    main()

