"""
Example script to test the F1 Pit Strategy API

Make sure the API server is running (python api.py) before running this script.
"""

import requests
import json


def test_health():
    """Test the health endpoint."""
    print("\n" + "="*60)
    print("Testing /health endpoint")
    print("="*60)
    
    response = requests.get('http://localhost:3000/health')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_model_info():
    """Test the model-info endpoint."""
    print("\n" + "="*60)
    print("Testing /model-info endpoint")
    print("="*60)
    
    response = requests.get('http://localhost:3000/model-info')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_predict(scenario_name, data):
    """Test the predict endpoint with given data."""
    print("\n" + "="*60)
    print(f"Testing /predict endpoint - {scenario_name}")
    print("="*60)
    print(f"Input: {json.dumps(data, indent=2)}")
    
    response = requests.post(
        'http://localhost:3000/predict',
        json=data,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def main():
    """Run API tests."""
    print("\n" + "="*60)
    print("F1 PIT STRATEGY API - TEST SCRIPT")
    print("="*60)
    print("\nMake sure the API server is running on http://localhost:3000")
    print("Run: python api.py")
    
    try:
        # Test health check
        test_health()
        
        # Test model info
        test_model_info()
        
        # Test Case 1: High tire wear - should recommend PIT NOW
        test_predict(
            "High Tire Wear",
            {
                "undercut_overcut_opportunity": 0,
                "tire_wear_percentage": 90,
                "performance_drop_seconds": 3.5,
                "track_position": 8,
                "race_incident": "None"
            }
        )
        
        # Test Case 2: Safety Car - should recommend PIT NOW
        test_predict(
            "Safety Car Opportunity",
            {
                "undercut_overcut_opportunity": 0,
                "tire_wear_percentage": 45,
                "performance_drop_seconds": 1.2,
                "track_position": 6,
                "race_incident": "Safety Car"
            }
        )
        
        # Test Case 3: Fresh tires, no opportunity - should recommend STAY OUT
        test_predict(
            "Fresh Tires",
            {
                "undercut_overcut_opportunity": 0,
                "tire_wear_percentage": 20,
                "performance_drop_seconds": 0.5,
                "track_position": 12,
                "race_incident": "None"
            }
        )
        
        # Test Case 4: Undercut opportunity with moderate wear - should recommend PIT NOW
        test_predict(
            "Undercut Opportunity",
            {
                "undercut_overcut_opportunity": 1,
                "tire_wear_percentage": 55,
                "performance_drop_seconds": 1.8,
                "track_position": 4,
                "race_incident": "None"
            }
        )
        
        # Test Case 5: Invalid input - missing field
        print("\n" + "="*60)
        print("Testing /predict endpoint - Invalid Input (Missing Field)")
        print("="*60)
        invalid_data = {
            "undercut_overcut_opportunity": 1,
            "tire_wear_percentage": 65,
            # Missing performance_drop_seconds
            "track_position": 5,
            "race_incident": "None"
        }
        print(f"Input: {json.dumps(invalid_data, indent=2)}")
        
        response = requests.post(
            'http://localhost:3000/predict',
            json=invalid_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        print("\n" + "="*60)
        print("✓ All tests completed!")
        print("="*60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to API server")
        print("Make sure the server is running: python api.py")
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == '__main__':
    main()

