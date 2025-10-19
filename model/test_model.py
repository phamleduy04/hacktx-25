"""
Quick test script to diagnose the F1 pit strategy model
"""

import joblib
import pandas as pd
import numpy as np

# Load the model and preprocessor
print("Loading model and preprocessor...")
model = joblib.load('output/f1_pit_strategy_model.joblib')
preprocessor = joblib.load('output/preprocessor.joblib')

print(f"Model type: {type(model).__name__}")
print(f"Model classes: {model.classes_}")
print(f"Feature importances: {model.feature_importances_}")

# Test case 1: Car just pitted (should STAY OUT)
test_case_1 = pd.DataFrame({
    'undercut_overcut_opportunity': [0],
    'tire_wear_percentage': [3.0],
    'performance_drop_seconds': [0.5],
    'track_position': [4],
    'race_incident': ['None'],
    'laps_since_pit': [1]
})

print("\n" + "="*60)
print("TEST CASE 1: Car just pitted with fresh tires")
print("="*60)
print(test_case_1.to_dict('records')[0])

X_processed = preprocessor.transform(test_case_1)
print(f"\nProcessed features: {X_processed}")
prediction = model.predict(X_processed)[0]
probabilities = model.predict_proba(X_processed)[0]

print(f"\nPrediction: {prediction}")
print(f"Probabilities:")
print(f"  PIT NOW: {probabilities[0]:.2%}")
print(f"  STAY OUT: {probabilities[1]:.2%}")

# Test case 2: High tire wear (should PIT NOW)
test_case_2 = pd.DataFrame({
    'undercut_overcut_opportunity': [0],
    'tire_wear_percentage': [90.0],
    'performance_drop_seconds': [3.5],
    'track_position': [4],
    'race_incident': ['None'],
    'laps_since_pit': [32]
})

print("\n" + "="*60)
print("TEST CASE 2: High tire wear and performance drop")
print("="*60)
print(test_case_2.to_dict('records')[0])

X_processed = preprocessor.transform(test_case_2)
print(f"\nProcessed features: {X_processed}")
prediction = model.predict(X_processed)[0]
probabilities = model.predict_proba(X_processed)[0]

print(f"\nPrediction: {prediction}")
print(f"Probabilities:")
print(f"  PIT NOW: {probabilities[0]:.2%}")
print(f"  STAY OUT: {probabilities[1]:.2%}")

# Test case 3: Safety Car (should PIT NOW)
test_case_3 = pd.DataFrame({
    'undercut_overcut_opportunity': [1],
    'tire_wear_percentage': [50.0],
    'performance_drop_seconds': [1.5],
    'track_position': [4],
    'race_incident': ['Safety Car'],
    'laps_since_pit': [18]
})

print("\n" + "="*60)
print("TEST CASE 3: Safety Car opportunity")
print("="*60)
print(test_case_3.to_dict('records')[0])

X_processed = preprocessor.transform(test_case_3)
print(f"\nProcessed features: {X_processed}")
prediction = model.predict(X_processed)[0]
probabilities = model.predict_proba(X_processed)[0]

print(f"\nPrediction: {prediction}")
print(f"Probabilities:")
print(f"  PIT NOW: {probabilities[0]:.2%}")
print(f"  STAY OUT: {probabilities[1]:.2%}")

# Test case 4: HIGH DEGRADATION - High wear in few laps (should PIT NOW)
test_case_4 = pd.DataFrame({
    'undercut_overcut_opportunity': [0],
    'tire_wear_percentage': [90.0],
    'performance_drop_seconds': [4.0],
    'track_position': [4],
    'race_incident': ['None'],
    'laps_since_pit': [11]  # Only 11 laps but 90% wear!
})

print("\n" + "="*60)
print("TEST CASE 4: High degradation (90% wear after only 11 laps)")
print("="*60)
print(test_case_4.to_dict('records')[0])

X_processed = preprocessor.transform(test_case_4)
print(f"\nProcessed features: {X_processed}")
prediction = model.predict(X_processed)[0]
probabilities = model.predict_proba(X_processed)[0]

print(f"\nPrediction: {prediction}")
print(f"Probabilities:")
print(f"  PIT NOW: {probabilities[0]:.2%}")
print(f"  STAY OUT: {probabilities[1]:.2%}")

# Check model structure
print("\n" + "="*60)
print("MODEL DIAGNOSTICS")
print("="*60)
print(f"Tree depth: {model.get_depth()}")
print(f"Number of leaves: {model.get_n_leaves()}")
print(f"Number of features: {model.n_features_in_}")

# Get feature names from preprocessor
try:
    feature_names = preprocessor.get_feature_names_out()
    print(f"\nActual feature names from preprocessor:")
    for i, name in enumerate(feature_names):
        importance = model.feature_importances_[i]
        print(f"  {i}: {name} (importance: {importance:.4f})")
except Exception as e:
    print(f"Could not get feature names: {e}")

# Print decision tree rules (first few)
from sklearn.tree import export_text
try:
    tree_rules = export_text(model, feature_names=list(feature_names), max_depth=3)
    print("\nDecision Tree Rules (simplified, depth=3):")
    print(tree_rules)
except Exception as e:
    print(f"Could not print tree rules: {e}")

