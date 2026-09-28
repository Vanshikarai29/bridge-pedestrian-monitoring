"""
Converts MOT20 (train sequences only, since test sequences have no
ground truth) into YOLO-format images/labels.

Expected input layout (after unzipping MOT20.zip's "train" folder into
data/mot20_raw/):

    data/mot20_raw/MOT20-01/img1/000001.jpg ...
    data/mot20_raw/MOT20-01/gt/gt.txt
    data/mot20_raw/MOT20-01/seqinfo.ini
    data/mot20_raw/MOT20-02/...
    data/mot20_raw/MOT20-03/...
    data/mot20_raw/MOT20-05/...

Run from the project root:
    python data/prepare_mot20.py
"""
import random
import shutil
import configparser
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "mot20_raw"
OUT_DIR = ROOT / "mot20_yolo"

STEP = 30                      # sample every 30th frame that has valid boxes
MIN_VISIBILITY = 0.35          # drop boxes that are almost fully occluded
PERSON_CLASSES = {1, 2, 7}     # MOTChallenge: 1=pedestrian, 2=person on vehicle, 7=static person
PERSON_CLASS_ID = 0            # our single YOLO class
SEED = 42

# Whole sequences held out for validation (avoids near-duplicate frames
# leaking between train/val, which frame-level shuffling would cause).
VAL_SEQUENCES = {"MOT20-05"}


def read_seq_size(seq_dir):
    cfg = configparser.ConfigParser()
    cfg.read(seq_dir / "seqinfo.ini")
    w = int(cfg["Sequence"]["imWidth"])
    h = int(cfg["Sequence"]["imHeight"])
    ext = cfg["Sequence"].get("imExt", ".jpg")
    return w, h, ext


def parse_gt(gt_path):
    boxes_by_frame = defaultdict(list)
    with open(gt_path) as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 9:
                continue
            frame_no = int(parts[0])
            cls = int(parts[7])
            visibility = float(parts[8])
            if cls not in PERSON_CLASSES or visibility < MIN_VISIBILITY:
                continue
            x, y, w, h = map(float, parts[2:6])
            boxes_by_frame[frame_no].append((x, y, x + w, y + h))
    return boxes_by_frame


def to_yolo_line(box, img_w, img_h):
    bl, bt, br, bb = box
    bl, br = max(0, bl), min(img_w, br)
    bt, bb = max(0, bt), min(img_h, bb)
    if br <= bl or bb <= bt:
        return None
    cx = (bl + br) / 2 / img_w
    cy = (bt + bb) / 2 / img_h
    w = (br - bl) / img_w
    h = (bb - bt) / img_h
    return f"{PERSON_CLASS_ID} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"


def main():
    print(f"[DEBUG] Using STEP={STEP}, MIN_VISIBILITY={MIN_VISIBILITY}")
    if not RAW_DIR.exists():
        raise SystemExit(
            f"Missing {RAW_DIR}. Unzip MOT20.zip's train/ sequences into data/mot20_raw/ first."
        )

    seq_dirs = sorted([d for d in RAW_DIR.iterdir() if d.is_dir() and (d / "gt" / "gt.txt").exists()])
    if not seq_dirs:
        raise SystemExit(f"No sequences with gt/gt.txt found under {RAW_DIR}.")

    for split in ("train", "val"):
        (OUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    random.seed(SEED)
    written = {"train": 0, "val": 0}

    for seq_dir in seq_dirs:
        seq_name = seq_dir.name
        split = "val" if seq_name in VAL_SEQUENCES else "train"

        img_w, img_h, ext = read_seq_size(seq_dir)
        boxes_by_frame = parse_gt(seq_dir / "gt" / "gt.txt")
        frame_nums = sorted(boxes_by_frame.keys())
        sampled = frame_nums[::STEP]
        print(f"[DEBUG] {seq_name}: total valid frames={len(frame_nums)}, STEP={STEP}, sampled count={len(sampled)}")

        for frame_no in sampled:
            src_img = seq_dir / "img1" / f"{frame_no:06d}{ext}"
            if not src_img.exists():
                continue

            lines = [to_yolo_line(b, img_w, img_h) for b in boxes_by_frame[frame_no]]
            lines = [l for l in lines if l]
            if not lines:
                continue

            stem = f"{seq_name}_{frame_no:06d}"
            shutil.copy(src_img, OUT_DIR / "images" / split / f"{stem}{ext}")
            (OUT_DIR / "labels" / split / f"{stem}.txt").write_text("\n".join(lines))
            written[split] += 1

        print(f"{seq_name}: {len(sampled)} frames sampled -> split '{split}'")

    print(f"Done. Wrote {OUT_DIR}")
    print(f"  train: {written['train']} images")
    print(f"  val:   {written['val']} images")


if __name__ == "__main__":
    main()