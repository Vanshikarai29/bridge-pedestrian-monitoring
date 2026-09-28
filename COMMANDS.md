# Command Reference

All commands below assume you're in the project root folder (the one with `README.md`
in it) with your virtual environment activated.

## 0. One-time setup

```bash
python -m venv venv
source venv/bin/activate              # Windows: venv\Scripts\activate
pip install -r requirements.txt
python data/fix_data_yaml.py          # fixes the bundled dataset's path for your machine
```

## 1. See it work in ~2 minutes (no GPU, no training)

```bash
# Terminal 1 -- start the backend + dashboard
python backend/run.py

# Terminal 2 -- replay the bundled synthetic bridge video through the tracker+counter+API
python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json
```

Open **http://localhost:5000** in a browser. You'll see occupancy, the footfall chart, and
alerts update live as Terminal 2 runs.

To just check the counting math without touching the API/dashboard at all:
```bash
python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json --no-api
```

## 2. Dataset

```bash
# Already bundled at data/pennfudan_yolo/ -- just fix its path for your machine:
python data/fix_data_yaml.py

# Only if you want to re-download/rebuild it from scratch instead:
python data/prepare_dataset.py

# Regenerate the synthetic bridge video/ground-truth (already included, but you can remake it):
python data/generate_synthetic_bridge_data.py
python data/generate_synthetic_bridge_data.py --pedestrians 20 --seconds 40 --seed 7   # custom
```

## 3. Train the detector (Colab / Kaggle -- free GPU)

```bash
# On your machine, zip the bundled dataset to upload:
cd data && zip -r pennfudan_yolo.zip pennfudan_yolo && cd ..
```
Then: upload `pennfudan_yolo.zip` and `notebooks/train_yolov8.ipynb` to Colab or Kaggle,
turn on the GPU, Run All. Full details in `README.md` section 3.

After training, download `best.pt` and place it at:
```bash
weights/best.pt
```

## 4. Run the real pipeline (your own video, with a trained or stock detector)

```bash
# With your fine-tuned weights:
python -m src.pipeline --source sample_videos/your_clip.mp4 --weights weights/best.pt

# Without weights (falls back to stock COCO yolov8n.pt automatically):
python -m src.pipeline --source sample_videos/your_clip.mp4

# Webcam:
python -m src.pipeline --source 0

# Show an annotated live video window while it runs:
python -m src.pipeline --source sample_videos/your_clip.mp4 --display

# Override the default counting line (pixel coordinates, endpoints a and b):
python -m src.pipeline --source sample_videos/your_clip.mp4 --line-a 0 300 --line-b 960 300

# Point at a different backend / bridge ID:
python -m src.pipeline --source sample_videos/your_clip.mp4 --bridge-id north-fob --api-url http://localhost:5000/api
```

## 5. Backend API -- calling it directly (curl examples)

```bash
# Start it first:
python backend/run.py
```

```bash
# Post a crossing event manually (direction: 1 = in, -1 = out)
curl -X POST http://localhost:5000/api/events/crossing \
  -H "Content-Type: application/json" \
  -d '{"bridge_id":"bridge-1","track_id":1,"direction":1}'

# Current occupancy
curl http://localhost:5000/api/occupancy/bridge-1

# All bridges
curl http://localhost:5000/api/bridges

# Footfall history (5-min buckets, last hour)
curl "http://localhost:5000/api/footfall/bridge-1?bucket_minutes=5&hours=1"

# Alerts (all, or only active)
curl http://localhost:5000/api/alerts/bridge-1
curl "http://localhost:5000/api/alerts/bridge-1?active=true"

# Set the occupancy alert threshold
curl -X POST http://localhost:5000/api/threshold/bridge-1 \
  -H "Content-Type: application/json" -d '{"threshold": 40}'

# Reset a bridge's data (testing/demo helper, not in the paper's spec)
curl -X POST http://localhost:5000/api/reset/bridge-1
```

## 6. Tests

```bash
pytest tests/ -v                          # all 24 tests
pytest tests/test_api.py -v               # 17 backend API tests only
pytest tests/test_line_counter.py -v      # 7 line-crossing logic tests only
```

## 7. Everything in order, copy-paste block

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python data/fix_data_yaml.py
pytest tests/ -v
python backend/run.py &
python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json
# open http://localhost:5000
```
