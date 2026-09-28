"""
Converts the Oxford Town Centre dataset (raw video + .top ground truth)
into YOLO-format images/labels, sampling every Nth annotated frame.

Run from the project root:
    python data/prepare_towncentre.py
"""
import cv2
import random
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "towncentre_raw"
OUT_DIR = ROOT / "towncentre_yolo"

VIDEO = RAW_DIR / "TownCentreXVID.mp4"
GT_FILE = RAW_DIR / "TownCentre-groundtruth.top"

STEP = 5          # sample every 5th annotated frame (~618 images; lower = more data, slower)
VAL_FRACTION = 0.1
SEED = 42
PERSON_CLASS_ID = 0


def parse_groundtruth(gt_path):
    boxes_by_frame = defaultdict(list)
    with open(gt_path) as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 12:
                continue
            frame_no = int(parts[1])
            body_valid = parts[3]
            bl, bt, br, bb = map(float, parts[8:12])
            if body_valid == "1" and br > bl and bb > bt:
                boxes_by_frame[frame_no].append((bl, bt, br, bb))
    return boxes_by_frame


def to_yolo_line(box, img_w, img_h):
    bl, bt, br, bb = box
    bl, br = max(0, bl), min(img_w, br)
    bt, bb = max(0, bt), min(img_h, bb)
    cx = (bl + br) / 2 / img_w
    cy = (bt + bb) / 2 / img_h
    w = (br - bl) / img_w
    h = (bb - bt) / img_h
    return f"{PERSON_CLASS_ID} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"


def main():
    if not VIDEO.exists() or not GT_FILE.exists():
        raise SystemExit(
            f"Missing input files. Expected:\n  {VIDEO}\n  {GT_FILE}\n"
            "Put your uploaded Town Centre files in data/towncentre_raw/ first."
        )

    boxes_by_frame = parse_groundtruth(GT_FILE)
    frame_nums = sorted(boxes_by_frame.keys())
    sampled = frame_nums[::STEP]

    random.seed(SEED)
    shuffled = sampled[:]
    random.shuffle(shuffled)
    n_val = max(1, int(len(shuffled) * VAL_FRACTION))
    val_set = set(shuffled[:n_val])

    for split in ("train", "val"):
        (OUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(VIDEO))
    img_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    img_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    written = 0
    for frame_no in sampled:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if not ret:
            continue

        split = "val" if frame_no in val_set else "train"
        stem = f"towncentre_{frame_no:05d}"
        img_path = OUT_DIR / "images" / split / f"{stem}.jpg"
        lbl_path = OUT_DIR / "labels" / split / f"{stem}.txt"

        cv2.imwrite(str(img_path), frame)
        lines = [to_yolo_line(b, img_w, img_h) for b in boxes_by_frame[frame_no]]
        lbl_path.write_text("\n".join(lines))
        written += 1

    cap.release()
    print(f"Done. Wrote {written} images/labels to {OUT_DIR}")
    print(f"  train: {len(sampled) - n_val} images")
    print(f"  val:   {n_val} images")


if __name__ == "__main__":
    main()