"""Shared configuration constants, matching the values used throughout the paper."""

# --- Detector ---
DEFAULT_WEIGHTS = "weights/best.pt"      # falls back to stock yolov8n.pt if missing
FALLBACK_WEIGHTS = "yolov8n.pt"
IMG_SIZE = 320
PERSON_CLASS_ID = 0

# --- Tracker ---
TRACKER_CFG = "bytetrack.yaml"           # Ultralytics' built-in ByteTrack config

# --- Virtual line-crossing counter (paper Section III-C) ---
MIN_BBOX_AREA_PX2 = 300     # A_min: discards small/distant false detections
TRACK_AGE_THRESHOLD_FRAMES = 5    # tau_age: minimum track age before it can register a crossing

# --- REST API ---
API_BASE_URL = "http://localhost:5000/api"
DEFAULT_BRIDGE_ID = "bridge-1"
DEFAULT_OCCUPANCY_THRESHOLD = 40  # alert fires when occupancy >= this value
