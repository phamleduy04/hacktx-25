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
    Generates HYBRID training data for the F1 pit strategy model.
    Combines real F1 data with synthetic strategic scenarios.
    
    Args:
        use_real_data (bool): Whether to attempt to fetch real F1 data
        num_samples (int): Number of synthetic samples to add
        
    Returns:
        pd.DataFrame: Hybrid dataset with features and target decision labels
    """
    all_data = []
    
    if use_real_data:
        try:
            print("Fetching real F1 data with ACTUAL pit stop decisions...")
            real_data = fetch_real_f1_data(years=[2024, 2023], max_sessions=8)
            
            print(f"\n✅ Fetched {len(real_data)} laps from real F1 races")
            print(f"Real data distribution:\n{real_data['decision'].value_counts()}")
            print(f"Real data race incidents:\n{real_data['race_incident'].value_counts()}\n")
            
            all_data.append(real_data)
            
        except Exception as e:
            print(f"\n⚠️  Failed to fetch real data: {e}")
            print("Using synthetic data only...\n")
    
    # ALWAYS add synthetic strategic scenarios to ensure good coverage
    print(f"Generating {num_samples} synthetic strategic scenarios...")
    synthetic_data = generate_training_data_synthetic(num_samples)
    all_data.append(synthetic_data)
    
    # Combine real + synthetic data
    if len(all_data) > 1:
        combined_data = pd.concat(all_data, ignore_index=True)
        print(f"\n✅ HYBRID DATASET CREATED")
        print(f"Total samples: {len(combined_data)}")
        print(f"  - Real F1 data: {len(all_data[0])}")
        print(f"  - Synthetic data: {len(synthetic_data)}")
    else:
        combined_data = all_data[0]
        print(f"\n✅ Using synthetic data only: {len(combined_data)} samples")
    
    print(f"\nFinal data distribution:\n{combined_data['decision'].value_counts()}")
    print(f"Final race incidents:\n{combined_data['race_incident'].value_counts()}")
    print(f"Percentage that pitted: {(combined_data['decision'] == 'PIT NOW').sum() / len(combined_data) * 100:.1f}%\n")
    
    return combined_data


def generate_training_data_synthetic(num_samples=2000):
    """
    Generates a synthetic dataset for training the F1 pit strategy model.
    Enhanced to ensure good representation of strategic scenarios.
    
    Args:
        num_samples (int): Number of training samples to generate
        
    Returns:
        pd.DataFrame: Dataset with features and target decision labels
    """
    print(f"Generating {num_samples} synthetic F1 scenario samples...")
    
    # Split samples: 70% normal scenarios, 30% strategic scenarios
    normal_samples = int(num_samples * 0.7)
    strategic_samples = num_samples - normal_samples
    
    all_samples = []
    
    # 1. NORMAL RACING SCENARIOS (70%)
    undercut_overcut_opportunity = np.random.choice([0, 1], size=normal_samples, p=[0.8, 0.2])
    tire_wear_percentage = np.random.randint(5, 98, size=normal_samples)
    
    # Generate performance drop with correlation to tire wear
    base_drop = np.random.uniform(0.1, 4.5, size=normal_samples) * (tire_wear_percentage / 100)**1.5
    random_component = np.random.uniform(-0.5, 1.5, size=normal_samples)
    performance_drop_seconds = np.clip(base_drop + random_component, 0.1, 4.5)
    
    track_position = np.random.randint(1, 21, size=normal_samples)
    race_incident = np.random.choice(
        ['None', 'Yellow Flag', 'Safety Car', 'VSC'],
        size=normal_samples,
        p=[0.85, 0.08, 0.04, 0.03]
    )
    
    # Generate laps since pit with VARIABLE degradation rates
    # Different tire compounds and tracks have different wear rates
    # Degradation factor: 0.5 (soft compound/high deg) to 1.5 (hard compound/low deg)
    degradation_factor = np.random.uniform(0.5, 1.5, size=normal_samples)
    base_laps = (tire_wear_percentage / 100) * 35 * degradation_factor
    laps_since_pit = np.round(base_laps).astype(int)
    laps_since_pit = np.clip(laps_since_pit, 1, 60)  # Allow up to 60 laps
    
    normal_data = pd.DataFrame({
        'undercut_overcut_opportunity': undercut_overcut_opportunity,
        'tire_wear_percentage': tire_wear_percentage,
        'performance_drop_seconds': performance_drop_seconds,
        'track_position': track_position,
        'race_incident': race_incident,
        'laps_since_pit': laps_since_pit
    })
    all_samples.append(normal_data)
    
    # 2. STRATEGIC SCENARIOS (30%) - Ensure good coverage of critical situations
    strategic_samples_per_type = strategic_samples // 5  # Split into 5 types now
    
    # 2a. Safety Car scenarios (should PIT)
    sc_samples = pd.DataFrame({
        'undercut_overcut_opportunity': np.random.choice([0, 1], size=strategic_samples_per_type),
        'tire_wear_percentage': np.random.randint(20, 90, size=strategic_samples_per_type),
        'performance_drop_seconds': np.random.uniform(0.5, 3.0, size=strategic_samples_per_type),
        'track_position': np.random.randint(1, 21, size=strategic_samples_per_type),
        'race_incident': ['Safety Car'] * strategic_samples_per_type,
        'laps_since_pit': np.random.randint(5, 40, size=strategic_samples_per_type)
    })
    all_samples.append(sc_samples)
    
    # 2b. VSC scenarios (should PIT)
    vsc_samples = pd.DataFrame({
        'undercut_overcut_opportunity': np.random.choice([0, 1], size=strategic_samples_per_type),
        'tire_wear_percentage': np.random.randint(25, 85, size=strategic_samples_per_type),
        'performance_drop_seconds': np.random.uniform(0.5, 2.5, size=strategic_samples_per_type),
        'track_position': np.random.randint(1, 21, size=strategic_samples_per_type),
        'race_incident': ['VSC'] * strategic_samples_per_type,
        'laps_since_pit': np.random.randint(5, 35, size=strategic_samples_per_type)
    })
    all_samples.append(vsc_samples)
    
    # 2c. Critical tire wear scenarios (should PIT)
    critical_wear_samples = pd.DataFrame({
        'undercut_overcut_opportunity': np.random.choice([0, 1], size=strategic_samples_per_type),
        'tire_wear_percentage': np.random.randint(85, 98, size=strategic_samples_per_type),
        'performance_drop_seconds': np.random.uniform(2.5, 4.5, size=strategic_samples_per_type),
        'track_position': np.random.randint(1, 21, size=strategic_samples_per_type),
        'race_incident': ['None'] * strategic_samples_per_type,
        'laps_since_pit': np.random.randint(30, 50, size=strategic_samples_per_type)
    })
    all_samples.append(critical_wear_samples)
    
    # 2d. Fresh tire scenarios (should STAY OUT)
    fresh_tire_samples = pd.DataFrame({
        'undercut_overcut_opportunity': np.random.choice([0, 1], size=strategic_samples_per_type, p=[0.9, 0.1]),
        'tire_wear_percentage': np.random.randint(5, 25, size=strategic_samples_per_type),
        'performance_drop_seconds': np.random.uniform(0.1, 0.8, size=strategic_samples_per_type),
        'track_position': np.random.randint(1, 21, size=strategic_samples_per_type),
        'race_incident': ['None'] * strategic_samples_per_type,
        'laps_since_pit': np.random.randint(1, 8, size=strategic_samples_per_type)
    })
    all_samples.append(fresh_tire_samples)
    
    # 2e. HIGH DEGRADATION scenarios (soft tires, hot track)
    # High tire wear in few laps - should still PIT based on wear/performance
    high_deg_samples = pd.DataFrame({
        'undercut_overcut_opportunity': np.random.choice([0, 1], size=strategic_samples_per_type),
        'tire_wear_percentage': np.random.randint(75, 98, size=strategic_samples_per_type),  # High wear
        'performance_drop_seconds': np.random.uniform(2.5, 4.5, size=strategic_samples_per_type),  # Big perf drop
        'track_position': np.random.randint(1, 21, size=strategic_samples_per_type),
        'race_incident': ['None'] * strategic_samples_per_type,
        'laps_since_pit': np.random.randint(8, 20, size=strategic_samples_per_type)  # FEW laps but high wear!
    })
    all_samples.append(high_deg_samples)
    
    # Combine all samples
    data = pd.concat(all_samples, ignore_index=True)
    
    # Add decision labels using shared logic
    data = add_decision_labels(data)
    
    print(f"Synthetic data generation complete:")
    print(f"  Distribution: {data['decision'].value_counts().to_dict()}")
    print(f"  Race incidents: {data['race_incident'].value_counts().to_dict()}")
    
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


def train_model(X_train, y_train, max_depth=8):
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
    print(f"  - min_samples_split=40")
    print(f"  - min_samples_leaf=15")
    print(f"  - max_features=None (use all features)")
    print(f"  - class_weight='balanced'")
    
    model = DecisionTreeClassifier(
        max_depth=max_depth,
        min_samples_split=40,  # Require at least 40 samples to split
        min_samples_leaf=15,   # Require at least 15 samples in leaf nodes
        max_features=None,     # Consider all features at each split
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
    print("F1 PIT STRATEGY MODEL - HYBRID TRAINING PIPELINE")
    print("="*60 + "\n")
    
    # 1. Generate HYBRID training data (real F1 data + synthetic strategic scenarios)
    dataset = generate_training_data(use_real_data=True, num_samples=3000)
    
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
    model = train_model(X_train_processed, y_train, max_depth=8)
    
    # 7. Evaluate model
    evaluate_model(model, X_test_processed, y_test)
    
    # 8. Save model and preprocessor
    save_model(model, preprocessor)
    
    print("\n✓ Training pipeline complete!\n")


if __name__ == '__main__':
    main()

