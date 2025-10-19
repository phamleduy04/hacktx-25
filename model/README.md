# F1 Pit Strategy Model

Machine learning model for predicting optimal F1 pit stop decisions based on race conditions.

## Setup

Install dependencies:
```bash
pip install -r requirements.txt
```

## Training the Model

Run the training script:
```bash
python train.py
```

This will:
- Generate 2,000 synthetic F1 racing scenarios
- Train a Decision Tree classifier
- Display evaluation metrics (accuracy, classification report, confusion matrix)
- Save the trained model to `output/f1_pit_strategy_model.joblib`
- Save the preprocessor to `output/preprocessor.joblib`
- Create a timestamped backup in the `output/` directory

## Model Inputs

The model considers the following features:
- `undercut_overcut_opportunity`: Binary indicator (0 or 1)
- `tire_wear_percentage`: Tire degradation level (5-98%)
- `performance_drop_seconds`: Lap time loss due to tire wear
- `track_position`: Current race position (1-20)
- `race_incident`: Track conditions (None, Yellow Flag, Safety Car, VSC)

## Model Output

The model predicts one of two decisions:
- **PIT NOW**: Recommend immediate pit stop
- **STAY OUT**: Recommend staying on track

## Using the Trained Model

```python
import joblib
import pandas as pd

# Load the model and preprocessor
model = joblib.load('output/f1_pit_strategy_model.joblib')
preprocessor = joblib.load('output/preprocessor.joblib')

# Prepare input data
race_scenario = pd.DataFrame({
    'undercut_overcut_opportunity': [1],
    'tire_wear_percentage': [65],
    'performance_drop_seconds': [2.1],
    'track_position': [5],
    'race_incident': ['None']
})

# Make prediction
X_processed = preprocessor.transform(race_scenario)
decision = model.predict(X_processed)
print(f"Recommended decision: {decision[0]}")
```

## Running the API Server

Start the Flask API server:
```bash
python api.py
```

The server will run on `http://localhost:3000`

### API Endpoints

#### POST /predict
Make a pit stop decision prediction.

**Request:**
```bash
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "undercut_overcut_opportunity": 1,
    "tire_wear_percentage": 65,
    "performance_drop_seconds": 2.1,
    "track_position": 5,
    "race_incident": "None"
  }'
```

**Response:**
```json
{
  "status": "success",
  "decision": "PIT NOW",
  "confidence": 0.95,
  "input_data": {
    "undercut_overcut_opportunity": 1,
    "tire_wear_percentage": 65,
    "performance_drop_seconds": 2.1,
    "track_position": 5,
    "race_incident": "None"
  }
}
```

#### GET /health
Check API health status.

#### GET /model-info
Get information about the loaded model.

### Testing the API

Run the test script to verify all endpoints:
```bash
python test_api.py
```

This will test:
- Health check endpoint
- Model info endpoint
- Various prediction scenarios (high tire wear, safety car, undercut opportunity, etc.)
- Input validation

## Model Files

After training, the following files will be created in the `output/` directory:
- `output/f1_pit_strategy_model.joblib`: The trained model
- `output/preprocessor.joblib`: The fitted data preprocessor
- `output/f1_model_YYYYMMDD_HHMMSS.joblib`: Timestamped backup

