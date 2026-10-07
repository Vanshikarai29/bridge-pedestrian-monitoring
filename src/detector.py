from pathlib import Path

from ultralytics import YOLO

from . import config as cfg


def load_detector(weights_path: str | None = None) -> YOLO:
    """Load fine-tuned weights if available, else fall back to the stock
    COCO-pretrained yolov8n.pt (Ultralytics downloads it automatically)."""
    weights_path = weights_path or cfg.DEFAULT_WEIGHTS
    if not Path(weights_path).exists():
        print(f"[detector] {weights_path} not found -- falling back to stock "
              f"'{cfg.FALLBACK_WEIGHTS}' (COCO-pretrained, not fine-tuned). "
              f"Train your own with notebooks/train_yolov8.ipynb for the paper's accuracy.")
        weights_path = cfg.FALLBACK_WEIGHTS
    model = YOLO(weights_path)
    return model
