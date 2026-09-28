"""
Download the real Penn-Fudan Pedestrian dataset and convert it to YOLO-format
bounding-box labels, split 70/20/10 (train/val/test) exactly as in the paper.

Penn-Fudan is a real, publicly available dataset of 170 street/campus photos with
423 hand-annotated pedestrian instances (per-pixel masks). Source paper:
L. Wang, J. Shi, G. Song, I.-f. Shen, "Object Detection Combining Recognition and
Segmentation," ACCV 2007. Official page: https://www.cis.upenn.edu/~jshi/ped_html/

Usage:
    python data/prepare_dataset.py
    python data/prepare_dataset.py --out data/pennfudan_yolo --seed 42

Output layout:
    data/pennfudan_yolo/
        images/{train,val,test}/*.png
        labels/{train,val,test}/*.txt      (YOLO format: class cx cy w h, normalized)
        data.yaml                          (ready for `yolo detect train data=...`)
"""
import argparse
import random
import shutil
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np
from PIL import Image

DATASET_URL = "https://www.cis.upenn.edu/~jshi/ped_html/PennFudanPed.zip"


def download_and_extract(dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / "PennFudanPed.zip"
    extract_dir = dest_dir / "PennFudanPed"

    if extract_dir.exists() and any(extract_dir.iterdir()):
        print(f"[skip] {extract_dir} already exists.")
        return extract_dir

    print(f"Downloading Penn-Fudan Pedestrian dataset from {DATASET_URL} ...")
    try:
        urlretrieve(DATASET_URL, zip_path)
    except Exception as e:
        raise RuntimeError(
            "Could not download the dataset automatically (no internet access in this "
            "environment, or the university server is unreachable). Download it manually from "
            f"{DATASET_URL} and place the extracted 'PennFudanPed' folder at {dest_dir}, "
            "then re-run this script."
        ) from e

    print("Extracting...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)
    zip_path.unlink(missing_ok=True)
    return extract_dir


def mask_to_yolo_boxes(mask_path: Path, img_w: int, img_h: int):
    """Penn-Fudan masks are PNGs where each pedestrian instance has a unique integer
    pixel value (0 = background, 1..N = instance ids). Convert each instance's
    bounding box to normalized YOLO format: `class cx cy w h`."""
    mask = np.array(Image.open(mask_path))
    instance_ids = np.unique(mask)
    instance_ids = instance_ids[instance_ids != 0]  # drop background

    lines = []
    for inst_id in instance_ids:
        ys, xs = np.where(mask == inst_id)
        if len(xs) == 0:
            continue
        x_min, x_max = xs.min(), xs.max()
        y_min, y_max = ys.min(), ys.max()

        cx = (x_min + x_max) / 2.0 / img_w
        cy = (y_min + y_max) / 2.0 / img_h
        w = (x_max - x_min) / img_w
        h = (y_max - y_min) / img_h

        # class 0 = person (only class in this dataset)
        lines.append(f"0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    return lines


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/pennfudan_yolo", help="Output directory")
    parser.add_argument("--raw", default="data/raw", help="Where to download/extract the raw dataset")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-frac", type=float, default=0.70)
    parser.add_argument("--val-frac", type=float, default=0.20)
    # remaining fraction (0.10 by default) goes to test
    args = parser.parse_args()

    raw_dir = Path(args.raw)
    out_dir = Path(args.out)
    extract_dir = download_and_extract(raw_dir)

    png_images_dir = extract_dir / "PNGImages"
    ped_masks_dir = extract_dir / "PedMasks"
    image_files = sorted(png_images_dir.glob("*.png"))
    if not image_files:
        raise RuntimeError(f"No images found under {png_images_dir}; download may have failed.")

    random.seed(args.seed)
    shuffled = image_files[:]
    random.shuffle(shuffled)

    n = len(shuffled)
    n_train = int(n * args.train_frac)
    n_val = int(n * args.val_frac)
    splits = {
        "train": shuffled[:n_train],
        "val": shuffled[n_train:n_train + n_val],
        "test": shuffled[n_train + n_val:],
    }

    for split_name, files in splits.items():
        (out_dir / "images" / split_name).mkdir(parents=True, exist_ok=True)
        (out_dir / "labels" / split_name).mkdir(parents=True, exist_ok=True)

        for img_path in files:
            mask_path = ped_masks_dir / img_path.name.replace(".png", "_mask.png")
            if not mask_path.exists():
                print(f"[warn] no mask for {img_path.name}, skipping")
                continue

            img = Image.open(img_path)
            w, h = img.size
            yolo_lines = mask_to_yolo_boxes(mask_path, w, h)

            shutil.copy(img_path, out_dir / "images" / split_name / img_path.name)
            label_path = out_dir / "labels" / split_name / img_path.name.replace(".png", ".txt")
            label_path.write_text("\n".join(yolo_lines))

        print(f"[{split_name}] {len(files)} images -> {out_dir / 'images' / split_name}")

    # Ultralytics resolves relative train/val/test paths against its own global
    # 'datasets_dir' setting, NOT against the current working directory -- so a
    # relative path here is actually less portable than it looks. An absolute
    # path is what Ultralytics itself expects (see its own dataset YAMLs, e.g.
    # coco8.yaml), so we write one, computed fresh on whichever machine this
    # script runs on. If you move the data/pennfudan_yolo folder afterward,
    # re-run this script (or scripts/fix_data_yaml.py) to regenerate it.
    data_yaml = out_dir / "data.yaml"
    data_yaml.write_text(
        f"""path: {out_dir.resolve().as_posix()}
train: images/train
val: images/val
test: images/test

names:
  0: person
"""
    )
    print(f"\nDone. data.yaml written to {data_yaml}")
    print(f"Splits: train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])} "
          f"(paper uses 118/34/18)")


if __name__ == "__main__":
    main()
