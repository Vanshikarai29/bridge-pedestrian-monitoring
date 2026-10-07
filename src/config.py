"""Shared configuration constants, matching the values used throughout the paper."""

# --- Detector ---
DEFAULT_WEIGHTS = "weights/best.pt"      # falls back to stock yolov8l.pt if missing
FALLBACK_WEIGHTS = "yolov8l.pt"          # was yolov8n.pt
IMG_SIZE = 640                           # was 320; train and infer at the same size
DEFAULT_CONF = 0.35                      # was 0.5; lower = more people found, more false boxes
PERSON_CLASS_ID = 0

# --- Tracker ---
TRACKER_CFG = "bytetrack.yaml"           # Ultralytics' built-in ByteTrack config

# --- Virtual line-crossing counter (paper Section III-C) ---
MIN_BBOX_AREA_PX2 = 300     # A_min: fixed value, used by the mock pipeline and the unit tests
# For real video the minimum area is scaled to the frame size instead, so it still
# makes sense at 1080p. 0.0009 of the frame area is about 300 px^2 at 768x432.
MIN_BBOX_AREA_FRACTION = 0.0009
TRACK_AGE_THRESHOLD_FRAMES = 5    # tau_age: minimum track age before it can register a crossing
LINE_HYSTERESIS_PX = 10           # dead zone (pixels) on each side of the line; stops double counting

# --- REST API ---
API_BASE_URL = "http://localhost:5000/api"
DEFAULT_BRIDGE_ID = "bridge-1"
DEFAULT_OCCUPANCY_THRESHOLD = 40  # alert fires when occupancy >= this value