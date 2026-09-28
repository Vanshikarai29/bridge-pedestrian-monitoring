"""
Merges pennfudan_yolo/ and towncentre_yolo/ into a single combined_yolo/
dataset with one data.yaml, ready to zip and train on in Colab.

Run from the project root:
    python data/merge_datasets.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCES = [ROOT / "pennfudan_yolo", ROOT / "towncentre_yolo",ROOT / "mot20_yolo"]
OUT_DIR = ROOT / "combined_yolo"


def main():
    for split in ("train", "val"):
        (OUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    total = 0
    for src in SOURCES:
        if not src.exists():
            print(f"Skipping missing source: {src}")
            continue
        for split in ("train", "val"):
            img_dir = src / "images" / split
            lbl_dir = src / "labels" / split
            if not img_dir.exists():
                continue
            for img_path in img_dir.iterdir():
                lbl_path = lbl_dir / (img_path.stem + ".txt")
                # prefix filenames with source name to avoid collisions
                new_stem = f"{src.name}_{img_path.stem}"
                shutil.copy(img_path, OUT_DIR / "images" / split / f"{new_stem}{img_path.suffix}")
                if lbl_path.exists():
                    shutil.copy(lbl_path, OUT_DIR / "labels" / split / f"{new_stem}.txt")
                total += 1

    yaml_content = f"""path: {OUT_DIR.resolve().as_posix()}
train: images/train
val: images/val
nc: 1
names: ['person']
"""
    (OUT_DIR / "data.yaml").write_text(yaml_content)
    print(f"Done. Combined {total} images into {OUT_DIR}")
    print(f"Wrote {OUT_DIR / 'data.yaml'}")


if __name__ == "__main__":
    main()