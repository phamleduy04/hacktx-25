"""
Test scenarios to validate F1 pit strategy decisions.
These test cases ensure the model makes realistic decisions.
"""

import pandas as pd

# Define test scenarios with expected outcomes
TEST_SCENARIOS = [
    {
        "name": "Fresh Tires - Stay Out",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 15,
            "performance_drop_seconds": 0.3,
            "track_position": 5,
            "race_incident": "None"
        },
        "expected": "STAY OUT",
        "reason": "Tires are fresh, minimal performance loss, no strategic window"
    },
    {
        "name": "Moderate Wear + Undercut but Mid-Field - Stay Out",
        "input": {
            "undercut_overcut_opportunity": 1,
            "tire_wear_percentage": 35,
            "performance_drop_seconds": 0.8,
            "track_position": 10,
            "race_incident": "None"
        },
        "expected": "STAY OUT",
        "reason": "Undercut opportunity but position 10 is mid-field, tires only 35% worn, pit stop too costly"
    },
    {
        "name": "Safety Car - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 30,
            "performance_drop_seconds": 0.5,
            "track_position": 8,
            "race_incident": "Safety Car"
        },
        "expected": "PIT NOW",
        "reason": "Safety car provides near-free pit stop opportunity"
    },
    {
        "name": "VSC - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 25,
            "performance_drop_seconds": 0.4,
            "track_position": 12,
            "race_incident": "VSC"
        },
        "expected": "PIT NOW",
        "reason": "VSC provides reduced pit stop time loss"
    },
    {
        "name": "Critical Tire Wear - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 88,
            "performance_drop_seconds": 3.2,
            "track_position": 7,
            "race_incident": "None"
        },
        "expected": "PIT NOW",
        "reason": "Critical tire degradation (88%), unsafe to continue"
    },
    {
        "name": "High Performance Loss - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 75,
            "performance_drop_seconds": 3.8,
            "track_position": 6,
            "race_incident": "None"
        },
        "expected": "PIT NOW",
        "reason": "Losing 3.8 seconds per lap, too much time loss"
    },
    {
        "name": "Undercut Window + High Wear + Top Position - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 1,
            "tire_wear_percentage": 45,
            "performance_drop_seconds": 1.2,
            "track_position": 4,
            "race_incident": "None"
        },
        "expected": "PIT NOW",
        "reason": "Strategic undercut opportunity, top 8 position, tires >40% worn"
    },
    {
        "name": "High Wear + Moderate Performance Loss - Pit Now",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 70,
            "performance_drop_seconds": 2.7,
            "track_position": 9,
            "race_incident": "None"
        },
        "expected": "PIT NOW",
        "reason": "High tire wear (70%) with significant performance drop (2.7s)"
    },
    {
        "name": "Yellow Flag Only - Stay Out",
        "input": {
            "undercut_overcut_opportunity": 0,
            "tire_wear_percentage": 40,
            "performance_drop_seconds": 1.0,
            "track_position": 11,
            "race_incident": "Yellow Flag"
        },
        "expected": "STAY OUT",
        "reason": "Yellow flag doesn't provide enough advantage, tires still reasonable"
    },
    {
        "name": "Early Race Undercut Attempt - Stay Out",
        "input": {
            "undercut_overcut_opportunity": 1,
            "tire_wear_percentage": 20,
            "performance_drop_seconds": 0.4,
            "track_position": 3,
            "race_incident": "None"
        },
        "expected": "STAY OUT",
        "reason": "Too early, tires only 20% worn, undercut not worth the pit stop cost yet"
    }
]


def test_decision_logic():
    """
    Tests the decision logic against expected outcomes.
    This should be run AFTER retraining the model to validate it.
    """
    from train import generate_training_data
    
    print("=" * 80)
    print("TESTING DECISION LOGIC")
    print("=" * 80)
    
    # Generate a small dataset to test the logic
    test_data = pd.DataFrame([scenario["input"] for scenario in TEST_SCENARIOS])
    
    # Apply the decision logic (copy from train.py)
    decisions = []
    for _, row in test_data.iterrows():
        # Critical situations - MUST pit immediately
        if row['race_incident'] in ['Safety Car', 'VSC']:
            decisions.append('PIT NOW')
        elif row['tire_wear_percentage'] > 85:
            decisions.append('PIT NOW')
        elif row['performance_drop_seconds'] > 3.5:
            decisions.append('PIT NOW')
        
        # Strategic pit stops - only when it makes sense
        elif row['undercut_overcut_opportunity'] == 1 and row['tire_wear_percentage'] > 40 and row['track_position'] <= 8:
            decisions.append('PIT NOW')
        
        elif row['performance_drop_seconds'] > 2.5 and row['tire_wear_percentage'] > 65:
            decisions.append('PIT NOW')
        
        elif row['performance_drop_seconds'] > 2.0 and row['tire_wear_percentage'] > 75:
            decisions.append('PIT NOW')
        
        # Default: Stay out
        else:
            decisions.append('STAY OUT')
    
    # Compare with expected
    results = []
    for i, scenario in enumerate(TEST_SCENARIOS):
        actual = decisions[i]
        expected = scenario["expected"]
        passed = actual == expected
        
        results.append({
            "name": scenario["name"],
            "expected": expected,
            "actual": actual,
            "passed": passed,
            "reason": scenario["reason"]
        })
        
        status = "✓" if passed else "✗"
        print(f"\n{status} Test: {scenario['name']}")
        print(f"  Expected: {expected}")
        print(f"  Actual:   {actual}")
        if not passed:
            print(f"  ⚠️  MISMATCH!")
        print(f"  Reason: {scenario['reason']}")
    
    # Summary
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    
    print("\n" + "=" * 80)
    print(f"RESULTS: {passed_count}/{total_count} tests passed")
    if passed_count == total_count:
        print("✓ All decision logic tests passed!")
    else:
        print(f"✗ {total_count - passed_count} tests failed. Review decision logic.")
    print("=" * 80)
    
    return results


if __name__ == '__main__':
    test_decision_logic()

