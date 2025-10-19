# F1 Pit Strategy Model

Machine learning model for predicting optimal F1 pit stop decisions based on race conditions.

**NEW:** The model now uses real F1 data from the [FastF1 package](https://docs.fastf1.dev/) to train on actual race scenarios! It automatically falls back to synthetic data if real data is unavailable.

## Setup

Install dependencies:
```bash
pip install -r requirements.txt
```

Note: The training script will download real F1 telemetry and timing data from recent races. This requires an internet connection and may take a few minutes on the first run (data is cached for subsequent runs).

## Training the Model

Run the training script:
```bash
python train.py
```

This will:
- **Fetch real F1 data** from 2023-2024 seasons (lap times, tire stints, positions, track status)
- Calculate performance metrics from actual race telemetry
- Train a Decision Tree classifier on real racing scenarios
- Display evaluation metrics (accuracy, classification report, confusion matrix)
- Save the trained model to `output/f1_pit_strategy_model.joblib`
- Save the preprocessor to `output/preprocessor.joblib`
- Create a timestamped backup in the `output/` directory

**Data Sources:**
- Real lap-by-lap data from FastF1 (when available)
- Actual tire stint information
- Real track incidents (Safety Car, VSC, Yellow Flags)
- Calculated performance drops from race telemetry
- Falls back to synthetic data if FastF1 is unavailable or internet connection fails

## Model Inputs

The model considers the following features:
- `undercut_overcut_opportunity`: Binary indicator (0 or 1) - strategic pit window
- `tire_wear_percentage`: Tire degradation level (5-98%)
- `performance_drop_seconds`: Lap time loss due to tire wear
- `track_position`: Current race position (1-20)
- `race_incident`: Track conditions (None, Yellow Flag, Safety Car, VSC)
- `laps_since_pit`: **NEW!** Number of laps since last pit stop (1-50)

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
    "race_incident": "None",
    "laps_since_pit": 23
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

