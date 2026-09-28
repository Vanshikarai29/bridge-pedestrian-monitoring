"""
The Penn-Fudan dataset shipped in data/pennfudan_yolo/ is already converted to YOLO
format and ready to train on -- no download needed. Its data.yaml just needs one line
(the absolute 'path:') updated to match wherever *this* copy of the project lives,
since that's how Ultralytics resolves dataset paths (see its own coco8.yaml for the
same pattern).

Run this once after unzipping/cloning the project, before training locally:
    python data/fix_data_yaml.py

(You do NOT need this for Colab/Kaggle -- the notebook rebuilds the dataset fresh in
that environment and gets the right path automatically.)
"""
from pathlib import Path

data_yaml = Path(__file__).resolve().parent / "pennfudan_yolo" / "data.yaml"
dataset_root = data_yaml.parent

if not data_yaml.exists():
    raise SystemExit(
        f"{data_yaml} not found. Either the bundled dataset wasn't included in your copy "
        f"of the project, or you deleted it -- run `python data/prepare_dataset.py` "
        f"to download and rebuild it from scratch instead."
    )

lines = data_yaml.read_text().splitlines()
new_lines = []
for line in lines:
    if line.startswith("path:"):
        new_lines.append(f"path: {dataset_root.as_posix()}")
    else:
        new_lines.append(line)

data_yaml.write_text("\n".join(new_lines) + "\n")
print(f"Updated {data_yaml} -> path: {dataset_root.as_posix()}")
