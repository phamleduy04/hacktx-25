# Quick Start Guide - Real F1 Data Training

## 🏁 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd model
pip install -r requirements.txt
```

This installs:
- `numpy`, `pandas`, `scikit-learn` - ML libraries
- `flask`, `flask-cors` - API server
- `fastf1` - **NEW!** Real F1 data access

### 2. Train the Model

```bash
python train.py
```

**What happens:**
- ✅ Downloads real F1 data from 2023-2024 races
- ✅ Processes ~3,000-5,000 actual race laps
- ✅ Calculates performance drops from real telemetry
- ✅ Trains Decision Tree on realistic scenarios
- ✅ Saves model to `output/` directory

**First run:** 2-5 minutes (downloads data)  
**Subsequent runs:** ~30 seconds (uses cache)

### 3. Start the API

```bash
python api.py
```

Server runs on `http://localhost:3000`

## 🧪 Test It Out

```bash
# In another terminal
python test_api.py
```

Or manually:
```bash
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "undercut_overcut_opportunity": 0,
    "tire_wear_percentage": 45,
    "performance_drop_seconds": 1.2,
    "track_position": 5,
    "race_incident": "None"
  }'
```

## 📊 Example Output

```json
{
  "status": "success",
  "decision": "STAY OUT",
  "confidence": 0.87,
  "input_data": { ... }
}
```

## 🎯 Real Data Features

Your model is now trained on:
- ✅ **Actual lap times** from F1 races
- ✅ **Real tire stints** and degradation
- ✅ **Genuine Safety Car** occurrences
- ✅ **True race positions** lap-by-lap
- ✅ **Calculated performance drops** from telemetry

## 🔧 Troubleshooting

### "No internet connection"
→ Model falls back to synthetic data automatically

### "FastF1 import error"
→ Run: `pip install fastf1`

### "Cache errors"
→ Delete `model/cache/` and re-run

### Want synthetic data only?
→ Edit `train.py` line 391:
```python
dataset = generate_training_data(use_real_data=False)
```

## 📚 Learn More

- `README.md` - Complete documentation
- `DATA_SOURCES.md` - Data details
- `CHANGES.md` - What's new
- https://docs.fastf1.dev/ - FastF1 docs

## 🚀 Next Steps

1. Train with more races (edit years in `train.py`)
2. Add tire compound data
3. Include weather conditions
4. Integrate with frontend
5. Deploy API to production

---

**Note:** The first training run downloads real F1 data (~100-200MB). This is cached in `model/cache/` for faster subsequent runs.

