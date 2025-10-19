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
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
from datetime import datetime


def generate_training_data(num_samples=2000):
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

    data = pd.DataFrame({
        'undercut_overcut_opportunity': undercut_overcut_opportunity,
        'tire_wear_percentage': tire_wear_percentage,
        'performance_drop_seconds': performance_drop_seconds,
        'track_position': track_position,
        'race_incident': race_incident
    })

    # Generate target labels based on racing strategy logic
    # This mimics real F1 pit strategy considering cost-benefit analysis
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
    print(f"Data generation complete. Distribution:\n{data['decision'].value_counts()}")
    return data


def create_preprocessor():
    """
    Creates a preprocessing pipeline for transforming categorical features.
    
    Returns:
        ColumnTransformer: Preprocessing pipeline
    """
    categorical_features = ['race_incident']
    one_hot = OneHotEncoder(handle_unknown='ignore')
    
    preprocessor = ColumnTransformer(
        [("one_hot", one_hot, categorical_features)],
        remainder="passthrough"
    )
    
    return preprocessor


def train_model(X_train, y_train, max_depth=7):
    """
    Trains a Decision Tree classifier for pit strategy prediction.
    
    Args:
        X_train: Training features
        y_train: Training labels
        max_depth (int): Maximum depth of the decision tree
        
    Returns:
        DecisionTreeClassifier: Trained model
    """
    print(f"Training Decision Tree model (max_depth={max_depth})...")
    model = DecisionTreeClassifier(max_depth=max_depth, random_state=42)
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
    
    # 1. Generate synthetic training data
    dataset = generate_training_data(num_samples=2000)
    
    # 2. Split features and target
    X = dataset.drop('decision', axis=1)
    y = dataset['decision']
    
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
    
    # 6. Train model
    model = train_model(X_train_processed, y_train, max_depth=7)
    
    # 7. Evaluate model
    evaluate_model(model, X_test_processed, y_test)
    
    # 8. Save model and preprocessor
    save_model(model, preprocessor)
    
    print("\n✓ Training pipeline complete!\n")


if __name__ == '__main__':
    main()

