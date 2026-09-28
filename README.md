# Bridge Pedestrian Counting & Crowd Monitoring

**Watch a video of a footbridge, count the people walking across it, and raise an alert when it gets too crowded, all shown live on a web dashboard.**

This project is a working implementation of the research paper *"Machine Learning Based Pedestrian Counting and Crowd Monitoring on Bridges Using Computer Vision."*

You do **not** need to know computer vision, Flask, or YOLO to use it. This README walks you through everything from zero. If you only want to see it work, jump to [Quick start (5 minutes)](#3-quick-start-see-it-work-in-5-minutes).

---

## Table of contents

1. [What does this project do?](#1-what-does-this-project-do)
2. [Get the code and set up](#2-get-the-code-and-set-up)
3. [Quick start: see it work in 5 minutes](#3-quick-start-see-it-work-in-5-minutes)
4. [Run it on your own video](#4-run-it-on-your-own-video)
5. [Understanding the results](#5-understanding-the-results)
6. [Training your own detector (Google Colab)](#6-training-your-own-detector-google-colab)
7. [Optional: training on more datasets](#7-optional-training-on-more-datasets)
8. [Tuning and accuracy: what to expect](#8-tuning-and-accuracy-what-to-expect)
9. [Project layout](#9-project-layout)
10. [API reference](#10-api-reference)
11. [Running the tests](#11-running-the-tests)
12. [Troubleshooting](#12-troubleshooting)
13. [Glossary](#13-glossary)
14. [What is real vs. simplified](#14-what-is-real-vs-simplified)

---

## 1. What does this project do?

### The problem

Footbridges can become dangerously crowded (festivals, events, rush hour). An operator needs to know **how many people are on the bridge right now**, and be warned **before** it gets unsafe.

### The solution, in plain English

A camera watches the bridge. The software:

1. **Finds people** in every video frame (this is called *detection*).
2. **Follows each person** from frame to frame and gives them a number, like `id:7` (this is called *tracking*).
3. **Counts a person when they cross a virtual line** drawn across the video (the red line you will see on screen).
4. **Sends each count to a small web server**, which keeps a running total and shows it on a **live dashboard**.
5. **Raises an alert** on the dashboard when the number of people goes above a limit you choose (default: 40).

### The pipeline

```
 Video (file / webcam / camera stream)
        |
        v
 [ YOLOv8 ]        finds every person in each frame          (src/detector.py)
        |
        v
 [ ByteTrack ]     gives each person a persistent ID          (built into Ultralytics)
        |
        v
 [ Line counter ]  counts when a tracked person crosses the   (src/tracker_counter.py)
        |          red line
        v
 [ Flask API ]     stores counts in a SQLite database         (backend/)
        |
        v
 [ Dashboard ]     live occupancy, chart, and alerts          (dashboard/)
```

### Why count *line crossings* instead of "people in the frame"?

If you just counted the people visible in each frame, the same person would be counted again and again while they walk through the picture. Counting **each person once, at the moment they cross a line**, is how you measure footfall (how many people passed) and occupancy (how many are on the bridge). This is the method the paper uses.

> **Important:** the number of *track IDs* (`id:1`, `id:2`, ...) is **not** the number of people. IDs are just labels the tracker hands out. If the detector is confused, IDs can climb into the hundreds for a video with three people. Only the **crossings** count matters. See [Understanding the results](#5-understanding-the-results).

---

## 2. Get the code and set up

### What you need

| Item | Notes |
|---|---|
| **Python** | Version **3.10, 3.11 or 3.12** is recommended. Very new versions (3.13+) can have trouble installing some packages; if `pip install` fails, use 3.11 or 3.12. |
| **A terminal** | Windows: PowerShell (or the terminal inside VS Code). Mac/Linux: Terminal. |
| **Git** | To download the project from GitHub (`git --version` to check). No Git? Use the green **Code → Download ZIP** button on the GitHub page and unzip it. |
| **~2 GB free disk space** | For Python packages and the model. |
| **A GPU?** | **No.** Running the project works fine on a normal laptop CPU. A GPU is only needed for *training* a new detector, and you can use Google Colab's free one for that ([section 6](#6-training-your-own-detector-google-colab)). |

Check Python is installed:

```
python --version
```

### Step 1: get the code from GitHub

```
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

Replace `<your-username>/<your-repo>` with this repository's address (copy it from the green **Code** button on the GitHub page). Everything below is run **inside that folder**, which is what we call the *project root*.

### What is (and isn't) in the repository

To keep the repository small, some files are deliberately **not** stored on GitHub (they are listed in `.gitignore`). After cloning you will not have them, and that is expected:

| Not in GitHub | Why | How you get it |
|---|---|---|
| `weights/best.pt` (trained model) | Model files are large binaries | Train one ([section 6](#6-training-your-own-detector-google-colab)), or ask whoever trained it to share the file (a GitHub *Release* or Google Drive link works well). Without it, the project falls back to the stock `yolov8n.pt`, downloaded automatically. |
| `sample_videos/*.mp4` and `*.json` (including the synthetic demo) | Videos are large | The demo files are generated by one command in [section 3](#3-quick-start-see-it-work-in-5-minutes). Put your own videos in this folder yourself. |
| `backend/bridge_monitoring.db` (database) | Created at runtime | Created automatically the first time the backend runs. |
| `runs/` (detection and training output) | Generated results | Created whenever you run detection or training. |

What **is** in the repository: all the code, the training notebook, `requirements.txt`, this README, the tests, and the **Penn-Fudan dataset** (`data/pennfudan_yolo/`, about 50 MB), so you can train without downloading any dataset.

### Step 2: one-time setup

Open a terminal **in the project root** and run:

**Windows (PowerShell)**
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python data/fix_data_yaml.py
```

**Mac / Linux**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python data/fix_data_yaml.py
```

What these do:

- `python -m venv venv` creates an isolated Python environment named `venv` so this project's packages don't clash with anything else.
- `venv\Scripts\activate` (or `source venv/bin/activate`) turns that environment on. You will see `(venv)` at the start of your prompt. **You must do this every time you open a new terminal.**
- `pip install -r requirements.txt` installs everything the project needs.
- `python data/fix_data_yaml.py` fixes a file path inside the bundled dataset so it points to *your* copy of the project (only needed if you train locally; harmless otherwise).

> **Windows note:** if `venv\Scripts\activate` complains that scripts are disabled, run this once in the same window, then activate again:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

> **PowerShell note:** PowerShell does not understand `&&` to chain commands (older versions) and does not have a `zip` command. Run commands one per line, and use `Compress-Archive` to make zip files (shown in section 6).

> **Golden rule:** always run commands **from the project root folder** (the one containing this README). The `-m` in `python -m src.pipeline` is required and must not be left out.

---

## 3. Quick start: see it work in 5 minutes

This demo needs **no training, no GPU, and no video of your own**. It replays a synthetic (computer-generated) bridge scene whose true answer is known, so you can check that the counting is correct.

**Step 0: create the demo files (once).** The demo video and its answer key are not stored on GitHub, so generate them:

```
python data/generate_synthetic_bridge_data.py
```

This writes `sample_videos/synthetic_bridge.mp4` and `sample_videos/synthetic_bridge_ground_truth.json` in a few seconds.

Then use **two terminals**, both in the project folder with `(venv)` active.

**Terminal 1: start the backend and dashboard**
```
python backend/run.py
```
Leave it running. It serves the dashboard at http://localhost:5000.

**Terminal 2: replay the synthetic scene**
```
python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json
```

Now open **http://localhost:5000** in your browser. You will see the occupancy number, the footfall chart and the alert log update as Terminal 2 runs. At the end, Terminal 2 prints something like:

```
Pipeline counted: 12
Ground truth:     12
Result: MATCH
```

`MATCH` means the counting logic is working correctly.

Want to check just the counting math without the server or dashboard?
```
python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json --no-api
```

To stop the backend, press `Ctrl+C` in Terminal 1.

---

## 4. Run it on your own video

Now let's use the real detector on real footage.

### Step 1: put a video in `sample_videos/`

Any `.mp4` works. Best results come from a camera looking along or down at a walkway with people walking roughly toward/away from it or across it.

### Step 2: make sure you have model weights

The detector needs a weights file. There are two options:

- **You have a trained `best.pt`** (you trained it in [section 6](#6-training-your-own-detector-google-colab), or someone shared it with you): put it at `weights/best.pt`. (This folder is git-ignored, so the file stays on your machine and won't be committed.)
- **You don't**: skip `--weights` and the project falls back to the stock `yolov8n.pt` (downloaded automatically the first time). It detects people reasonably well but was not fine-tuned for this project.

### Step 3: start the backend (Terminal 1)

```
python backend/run.py
```

### Step 4: run the pipeline (Terminal 2)

```
python -m src.pipeline --source sample_videos/your_clip.mp4 --weights weights/best.pt --display
```

A window opens showing the video with boxes around people, their IDs, and a **red counting line**. Press **`q`** in that window to stop early. When the video ends, the terminal prints the total number of crossings.

You can leave the backend off and add `--no-api` to just print counts without sending them anywhere.

### All the options

| Option | What it does | Example |
|---|---|---|
| `--source` | Video file, camera stream URL, or `0` for your webcam | `--source sample_videos/clip.mp4` |
| `--weights` | Path to trained weights (defaults to `weights/best.pt`, then stock `yolov8n.pt`) | `--weights weights/best.pt` |
| `--display` | Show the live annotated video window | `--display` |
| `--imgsz` | Image size the detector works at. **Bigger finds smaller/farther people** but is slower. Default `320`. | `--imgsz 960` |
| `--conf` | Minimum confidence (0 to 1) to accept a detection. **Lower finds more, but adds false alarms.** Default `0.5`. | `--conf 0.3` |
| `--line-a X Y` `--line-b X Y` | Position of the counting line, in pixels (two endpoints) | `--line-a 0 300 --line-b 768 300` |
| `--bridge-id` | Name of the bridge these counts belong to | `--bridge-id north-bridge` |
| `--api-url` | Where the backend lives | `--api-url http://localhost:5000/api` |
| `--no-api` | Don't send events to the backend | `--no-api` |
| `--mock-detections` | Replay a ground-truth JSON instead of running a detector (demo mode) | see section 3 |

### Placing the counting line

By default the line is **horizontal, at 60% of the frame height, across the full width**. When the pipeline starts it prints the video size and the line, for example:

```
Opened source 'clip.mp4' (768x432). Counting line: (0, 259) -> (768, 259)
```

A person is counted when their box **center crosses that line**. So the line should sit where people actually walk *across* it. If your people walk left-to-right, use a vertical line:

```
python -m src.pipeline --source sample_videos/clip.mp4 --line-a 384 0 --line-b 384 432 --display
```

### A good first command for hard footage

If people are small or far away, try a larger image size and a moderate confidence:

```
python -m src.pipeline --source sample_videos/clip.mp4 --weights weights/best.pt --imgsz 960 --conf 0.4 --display
```

---

## 5. Understanding the results

### What you see in the video window

- **Blue boxes** with `id:N person 0.xx`: a detected person, their tracker ID, and how confident the detector is (0 to 1).
- **Red line**: the virtual counting line.

### What the terminal prints

```
  frame 158: track 2 crossed (running total = 1)
Processed 223 frames in 28.2s (7.9 FPS)
Total crossings counted: 1
```

- `track 2 crossed` means the person labelled **ID 2** crossed the line. It does **not** mean there are two people.
- `running total` is how many crossings have been counted so far.
- The last line is the total for the whole video.

### What the dashboard shows (http://localhost:5000)

- **Current Occupancy**: how many people are on the bridge now, next to the alert threshold (default 40). The label changes from *nominal* to an alert state when the threshold is reached.
- **Footfall Trend**: a bar chart of people counted per 5-minute bucket over the last hour.
- **Alert Log**: a history of times the threshold was exceeded.
- **Threshold box**: type a new number and press *Update* to change the alert limit.

The dashboard refreshes itself every 3 seconds.

### Things to know about the count

1. **A count is only as good as the detection.** If the detector mistakes railings for people, those fake "people" can drift across the line and be counted.
2. **A person hovering right on the line can be counted more than once**, because a crossing is recorded every time their center switches sides. You may see `track 46 crossed` on consecutive frames. Place the line where people don't stop.
3. **Direction is not detected yet.** In the current live pipeline every crossing is reported to the backend as "in" (`+1`). The API supports "out" (`-1`), but the pipeline does not compute direction, so occupancy in live mode only goes up until you reset it.
4. **Small and distant detections are ignored** on purpose: boxes smaller than 1500 pixels² are discarded, and a track must exist for 5 frames before it may count (`src/config.py`).

---

## 6. Training your own detector (Google Colab)

Training teaches the model what a "person" looks like using labelled photos. It needs a GPU, so we use Google Colab's free one. It takes about 5 to 20 minutes depending on dataset size.

> You only need this section if you want to improve on the stock model. To just see the project run, skip it.

### What you need

- A Google account and access to [colab.research.google.com](https://colab.research.google.com)
- The notebook `notebooks/train_yolov8.ipynb` (it lives in this repository)
- A dataset. The Penn-Fudan dataset is **already in the repository**; anything larger (like the combined dataset in [section 7](#7-optional-training-on-more-datasets)) is not on GitHub and has to be uploaded.

### Step 1: open Colab and turn on the GPU

Open the notebook straight from GitHub. Either click this badge (fill in your repo address first):

```
https://colab.research.google.com/github/<your-username>/<your-repo>/blob/main/notebooks/train_yolov8.ipynb
```

or in Colab choose **File → Open notebook → GitHub tab**, paste the repository address, and pick `notebooks/train_yolov8.ipynb`. (If the repository is private, sign in to GitHub from that tab, or use Route B below.)

Then choose **Runtime → Change runtime type → T4 GPU → Save**, and check it by running `!nvidia-smi` in a cell. You should see a GPU listed.

> Free GPU time is limited. If Colab says *"Cannot connect to GPU backend ... usage limits"*, wait a few hours, use another Google account, or try [Kaggle Notebooks](https://www.kaggle.com/code) (also a free GPU). Do **not** click "Connect without GPU" for training; it will be many times slower.

### Step 2: get the code and data into Colab

Colab forgets everything each time a session restarts, so redo this step whenever that happens. Pick one route.

#### Route A (easiest): Penn-Fudan straight from GitHub, nothing to upload

Because the dataset is inside the repository, cloning it also brings the data. Run this in a cell:

```python
# 1. Download the project (includes data/pennfudan_yolo)
!git clone https://github.com/<your-username>/<your-repo>.git
%cd <your-repo>

# 2. Install the detector library
!pip install -q ultralytics

# 3. Point the dataset file at this Colab copy
!python data/fix_data_yaml.py

from pathlib import Path
data_yaml_path = Path("data/pennfudan_yolo/data.yaml")
print(data_yaml_path.read_text())
```

> **Do not** run `pip install -r requirements.txt` in Colab. Colab already ships its own NumPy, OpenCV and PyTorch, and installing the pinned versions on top can clash with them (a common cause of `numpy.dtype size changed` errors). Installing just `ultralytics` is enough.

Once this cell has run, you can skip the notebook's own dataset cells (the "Get the dataset" download cells and "2b") and go straight to training.

#### Route B: your own or larger dataset (not on GitHub)

Use this for the combined dataset from [section 7](#7-optional-training-on-more-datasets) or any dataset you built yourself.

**B1. Zip it on your computer**

Windows (PowerShell):
```powershell
Compress-Archive -Path data\combined_yolo -DestinationPath data\combined_yolo.zip -Force
```
Mac / Linux:
```bash
cd data && zip -r combined_yolo.zip combined_yolo && cd ..
```

**B2. Get the zip into Colab**

Small zip: run this cell and pick the file.
```python
from google.colab import files
uploaded = files.upload()
```

Large zip (hundreds of MB) or a slow or stuck upload: upload it to Google Drive from your browser first, then:
```python
from google.colab import drive
drive.mount('/content/drive')

import shutil
shutil.copy('/content/drive/MyDrive/combined_yolo.zip', 'combined_yolo.zip')
```

**B3. Install the library and unzip**

```python
!pip install -q ultralytics
```

Zips made by Windows `Compress-Archive` store paths with backslashes, which Colab's Linux cannot read properly. This extraction code handles that (change the names if yours are different):

```python
import zipfile
from pathlib import Path

zip_path = Path("combined_yolo.zip")
folder = "combined_yolo"

with zipfile.ZipFile(zip_path, "r") as zf:
    for member in zf.namelist():
        fixed = member.replace("\\", "/")
        target = Path(fixed)
        if member.endswith(("\\", "/")):
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(target, "wb") as dst:
                dst.write(src.read())

data_yaml_path = Path(f"{folder}/data.yaml")
lines = data_yaml_path.read_text().splitlines()
fixed_lines = [
    f"path: {Path(folder).resolve().as_posix()}" if l.startswith("path:") else l
    for l in lines
]
data_yaml_path.write_text("\n".join(fixed_lines) + "\n")

print(data_yaml_path.read_text())
print("train images:", len(list(Path(f"{folder}/images/train").glob("*"))))
print("val images:  ", len(list(Path(f"{folder}/images/val").glob("*"))))
```

The last two lines are a sanity check. If the image counts are zero, the zip did not extract correctly.

### Step 3: train

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")            # start from a general-purpose pretrained model

results = model.train(
    data=str(data_yaml_path),
    imgsz=320,
    batch=8,
    epochs=55,
    patience=0,
    project="runs/detect",
    name="train",
    exist_ok=True,
    classes=[0],                      # person only
    augment=True,
    fliplr=0.5,
    degrees=10.0,
    hsv_h=0.015, hsv_s=0.5, hsv_v=0.3,
)
```

The paper's settings are `imgsz=320`, `batch=8`, `epochs=38` on Penn-Fudan alone. Use more epochs (about 55) if you train on a bigger dataset.

At the end you get a table with **Precision, Recall, mAP50** on the validation images. Higher is better; these numbers describe how well the model matches the *labelled validation photos*, not how it will do on your own video.

### Step 4: download the trained weights

First find where `best.pt` was saved (the folder is sometimes nested, like `runs/detect/runs/detect/train/`):
```python
!find runs -type f -name "best.pt"
```

Then download it, using the path printed above:
```python
import shutil
from google.colab import files

best_path = "runs/detect/train/weights/best.pt"     # use the path from the find command
shutil.copy(best_path, "best.pt")
files.download("best.pt")
```

### Step 5: use it

Put the downloaded file at `weights/best.pt` in your local copy of the project (replace the old one) and run the pipeline as in [section 4](#4-run-it-on-your-own-video).

`weights/*.pt` is git-ignored on purpose, so the file will not be committed. If teammates need your trained model, share it as a **GitHub Release** attachment or a Drive link rather than committing it.

---

## 7. Optional: training on more datasets

The bundled Penn-Fudan dataset has only 170 photos of pedestrians on ordinary streets. A model trained only on it can struggle in unusual scenes (tunnels, glass, backlighting, tiny far-away people). Adding more varied pedestrian data can help it generalize.

The `data/` folder contains helper scripts to build a combined dataset. **The raw datasets are not included; download them yourself** and place them as shown.

| Script | What it does | Expects |
|---|---|---|
| `data/prepare_mot20.py` | Converts MOT20 (dense crowd surveillance) to YOLO format | `data/mot20_raw/MOT20-01/...` (the *train* sequences) |
| `data/prepare_towncentre.py` | Converts the Town Centre dataset to YOLO format | `data/towncentre_raw/...` |
| `data/merge_datasets.py` | Merges Penn-Fudan + Town Centre + MOT20 into one folder | the three `*_yolo` folders made above |

Run from the project root:

```
python data/prepare_mot20.py
python data/prepare_towncentre.py
python data/merge_datasets.py
```

The result is `data/combined_yolo/` with a ready `data.yaml`. Zip it and train exactly as in [section 6](#6-training-your-own-detector-google-colab).

### Settings that matter in `prepare_mot20.py`

| Setting | Meaning | Advice |
|---|---|---|
| `MIN_VISIBILITY` | Drop labelled people who are less than this fraction visible | `0.1` keeps heavily hidden people, which teaches the model to treat cluttered patterns as people. Use around **`0.35`** for cleaner labels. |
| `STEP` | Use every Nth frame of each video | Neighbouring frames are near-duplicates. Larger values give a smaller, less repetitive set. |

### Keep the large data out of GitHub

The raw datasets and converted folders are big (MOT20 alone is several GB), and GitHub rejects any single file over 100 MB. Only `data/pennfudan_yolo/` is meant to be in the repository. Add these lines to `.gitignore` so the rest never gets committed by accident:

```
data/mot20_raw/
data/towncentre_raw/
data/mot20_yolo/
data/towncentre_yolo/
data/combined_yolo/
*.zip
```

### Tips that save headaches

- **Delete old output folders before re-running.** The prepare/merge scripts add files but do not clear old ones, so stale data can mix in:
  ```powershell
  Remove-Item -Recurse -Force data\mot20_yolo
  Remove-Item -Recurse -Force data\combined_yolo
  ```
- **MOT20 is extremely dense** (well over 100 people in a typical frame). It can dominate a small dataset. Keep an eye on the "Instances" number in the training output versus the number of images.
- **Always save your Python file before re-running it.** If numbers don't change after an edit, check the value actually in the file with:
  ```powershell
  Get-Content data\prepare_mot20.py | Select-String "STEP|MIN_VISIBILITY"
  ```
- **Getty/stock videos are for testing only.** They have no labels, so they cannot be used for training and cannot produce an accuracy score.

---

## 8. Tuning and accuracy: what to expect

### What controls detection quality

1. **Training data.** The single biggest factor. The model only recognizes what resembles its training photos.
2. **`--imgsz` (image size).** The default `320` matches training but makes small or distant people only a few pixels wide. Trying `640` or `960` often finds many more people. It is slower.
3. **`--conf` (confidence).** Higher (`0.5` to `0.6`) means fewer false alarms but more missed people. Lower (`0.1` to `0.25`) finds more people but may label railings, shadows and edges as people.
4. **Counting line placement.** Put it where people flow across it and don't linger.

A common pattern: a model trained on ordinary street photos finds **nothing** in a dark, backlit corridor at `--imgsz 320`, finds people at `--imgsz 960`, and starts producing false boxes on structures when `--conf` is set very low. Adjust one setting at a time and watch the display window.

### Quick check: is the detector seeing people at all?

Create a file called `test_detection.py` in the project root (this is a **Python file**: do not paste this into the terminal), then run `python test_detection.py`:

```python
from ultralytics import YOLO

model = YOLO("weights/best.pt")
model.predict(
    "sample_videos/your_clip.mp4",
    imgsz=960, conf=0.25, save=True, name="check",
)
# The annotated video is saved under runs/detect/check/
```

The console prints something like `15 persons` per frame, or `(no detections)`. If it says no detections for a video that clearly has people, raise `imgsz` or lower `conf`.

### Can I get an accuracy percentage on my own video?

Only if you label it. Accuracy compares predictions with known-correct answers, and a raw video has none. Options: label some frames yourself (tools like CVAT or Roboflow) and run `model.val()`; or compare the model's crossing count against a count you did by eye. The bundled synthetic scene is special because its true crossing count is known.

---

## 9. Project layout

```
bridge-pedestrian-monitoring/
├── README.md                    <- you are here
├── COMMANDS.md                  <- copy-paste command reference
├── requirements.txt             <- Python packages to install
│
├── src/                         <- the detection + counting code
│   ├── config.py                <- settings (image size, area filter, API URL, ...)
│   ├── detector.py              <- loads the YOLOv8 model
│   ├── tracker_counter.py       <- the virtual line-crossing counter
│   └── pipeline.py              <- runs everything end to end (start here)
│
├── backend/                     <- the web server
│   ├── run.py                   <- starts it: python backend/run.py
│   └── app/
│       ├── models.py            <- database tables (SQLite)
│       └── routes.py            <- the API endpoints
│
├── dashboard/                   <- the web page you see in the browser
│   ├── templates/index.html
│   └── static/dashboard.js, dashboard.css
│
├── data/                        <- datasets and preparation scripts
│   ├── pennfudan_yolo/          <- bundled real pedestrian dataset (YOLO format)
│   ├── fix_data_yaml.py         <- fixes the dataset path for your machine
│   ├── prepare_dataset.py       <- rebuilds Penn-Fudan from scratch (optional)
│   ├── generate_synthetic_bridge_data.py  <- makes the synthetic demo video
│   └── prepare_mot20.py, prepare_towncentre.py, merge_datasets.py   <- optional, section 7
│
├── notebooks/train_yolov8.ipynb <- training notebook for Colab / Kaggle
├── weights/                     <- put your trained best.pt here
├── sample_videos/               <- put your videos here (a synthetic demo is included)
└── tests/                       <- automated tests
```

**Files that get created for you while you use it:** `backend/bridge_monitoring.db` (the database) and `runs/` (results from detection or training). You can delete them safely; they are recreated. Model weights and videos are not stored in GitHub ([section 2](#2-get-the-code-and-set-up)).

**A small Git note:** running `python data/fix_data_yaml.py` rewrites the `path:` line in `data/pennfudan_yolo/data.yaml` to your machine's location, so Git will show that file as modified. Don't commit that change.

---

## 10. API reference

The backend exposes a REST API at `http://localhost:5000/api`. You normally never call it by hand (the pipeline and dashboard do), but it is useful for testing or connecting other tools.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/events/crossing` | Report one crossing. Body: `{"bridge_id":"bridge-1","track_id":1,"direction":1}` (`1` = in, `-1` = out) |
| `GET` | `/occupancy/<bridge_id>` | Current occupancy and threshold |
| `GET` | `/bridges` | List all known bridges |
| `GET` | `/footfall/<bridge_id>?bucket_minutes=5&hours=1` | People counted per time bucket |
| `GET` | `/alerts/<bridge_id>` | Alert history (add `?active=true` for active only) |
| `GET` / `POST` | `/threshold/<bridge_id>` | Read or set the alert threshold. Body: `{"threshold": 40}` |
| `POST` | `/reset/<bridge_id>` | Clear a bridge's data (testing helper) |

Examples (Mac/Linux `curl`; on Windows PowerShell use `curl.exe` or a tool like Postman):

```bash
curl http://localhost:5000/api/occupancy/bridge-1

curl -X POST http://localhost:5000/api/events/crossing \
  -H "Content-Type: application/json" \
  -d '{"bridge_id":"bridge-1","track_id":1,"direction":1}'
```

To start fresh between test runs:
```bash
curl -X POST http://localhost:5000/api/reset/bridge-1
```

---

## 11. Running the tests

```
pytest tests/ -v
```

There are **24 tests**: 17 for the backend API (occupancy accounting, alerts, input validation, footfall buckets) and 7 for the line-crossing logic. They should all pass on a fresh setup and are a good way to confirm your installation is healthy.

---

## 12. Troubleshooting

| What you see | What it means / what to do |
|---|---|
| `No module named 'src'` or import errors when running the pipeline | Run from the **project root** and use `python -m src.pipeline ...` (with `-m`, no `.py`). |
| `ModuleNotFoundError: No module named 'ultralytics'` (or another package) | Activate the virtual environment (`venv\Scripts\activate`) and run `pip install -r requirements.txt`. In Colab, run `!pip install -q ultralytics`. |
| `[api] could not reach backend ... Is python backend/run.py running?` | The backend isn't running. Start it in another terminal, or add `--no-api`. The pipeline still counts; it just can't report. |
| Dashboard shows nothing / page won't load | Make sure `python backend/run.py` is running and open http://localhost:5000. If port 5000 is busy, close whatever is using it. |
| `ValueError: numpy.dtype size changed, may indicate binary incompatibility` | Two incompatible NumPy versions are mixed. Fix by reinstalling together: `pip install --force-reinstall "numpy<2.3" opencv-python-headless ultralytics`, then **restart the Python kernel/session**. |
| `The token '&&' is not a valid statement separator` (PowerShell) | Run the commands on separate lines. |
| `zip : The term 'zip' is not recognized` (Windows) | Use `Compress-Archive -Path <folder> -DestinationPath <name>.zip -Force`. |
| `Compress-Archive ... already exists` | Add `-Force` to overwrite. |
| Colab: `FileNotFoundError: combined_yolo/data.yaml` | The zip was made on Windows. Use the backslash-safe extraction code in Route B of [section 6](#6-training-your-own-detector-google-colab). |
| Colab: `NameError: name 'data_yaml_path' is not defined` | The extraction cell hasn't run in this session. Colab forgets everything when it restarts, so re-run cells top to bottom. |
| Colab: `Cannot connect to GPU backend` | Free GPU limit reached. Wait, use another account, or use Kaggle. |
| Colab: `best.pt` not where expected | Search for it: `!find runs -type f -name "best.pt"`. |
| Copy/pasted Python into the terminal and got `The 'from' keyword is not supported` | That code belongs **inside a `.py` file** (or a notebook cell), then run with `python file.py`. |
| `FileNotFoundError: ...synthetic_bridge_ground_truth.json` | The demo files aren't stored on GitHub. Run `python data/generate_synthetic_bridge_data.py` first. |
| The pipeline downloads `yolov8n.pt` instead of using my model | `weights/best.pt` isn't in your local copy (it isn't on GitHub). Train one or get the file from whoever has it ([section 2](#2-get-the-code-and-set-up)). |
| `git clone` asks for a password or says the repository is not found | The repository is private or the address is wrong. Check the URL, or sign in to GitHub. |
| Video shows **no boxes at all** | People may be too small for the settings. Try `--imgsz 960` and/or a lower `--conf`. |
| Video shows **boxes on railings, walls or shadows** and IDs climb very high | Confidence is too low or the model needs better training data. Raise `--conf`; see [sections 7 and 8](#7-optional-training-on-more-datasets). |
| Crossing count seems too high or too low | Check the line position, watch the display window, and remember crossings can repeat if someone stands on the line ([section 5](#5-understanding-the-results)). |
| Pipeline is slow | Normal on CPU, especially with a large `--imgsz`. Lower it, or use a shorter clip. |
| After editing a script, results are unchanged | Make sure you **saved** the file. Old output folders may also need deleting ([section 7](#7-optional-training-on-more-datasets)). |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Detection** | Finding objects (here, people) in an image and drawing a box around each. |
| **YOLOv8** | A fast, popular object detection model. "n" (nano) is its smallest, quickest version. |
| **Tracking** | Following the same object across frames so it keeps the same ID. |
| **ByteTrack** | The tracking algorithm used here (built into Ultralytics). |
| **Track ID** | The number a tracker assigns to a followed object. Not a people count. |
| **Confidence** | How sure the detector is about a detection, from 0 to 1. |
| **Virtual line / counting line** | An imaginary line across the video. Crossing it registers a count. |
| **Crossing** | A tracked person's center moving from one side of the counting line to the other. |
| **Occupancy** | How many people are on the bridge right now. |
| **Footfall** | How many people passed over a period of time. |
| **Threshold** | The occupancy at or above which an alert is raised (default 40). |
| **Weights (`best.pt`)** | The trained model file. |
| **Training / fine-tuning** | Teaching the model from labelled examples; here, starting from a general pretrained model and adapting it to people. |
| **Epoch** | One full pass through the training images. |
| **mAP50** | A standard detection quality score (0 to 1, higher is better) measured against labelled images. |
| **Ground truth** | The known-correct answer used to check results. |
| **imgsz** | The image size the detector resizes frames to. Bigger sees smaller objects but runs slower. |
| **Colab / Kaggle** | Free online notebooks that lend you a GPU for training. |

---

## 14. What is real vs. simplified

- **Detector:** real YOLOv8n, fine-tuned on the real Penn-Fudan dataset (matching the paper) and optionally on more data ([section 7](#7-optional-training-on-more-datasets)).
- **Tracker:** Ultralytics' built-in ByteTrack (`bytetrack.yaml`), the same two-stage high/low-confidence matching described in the paper.
- **Line-crossing counter:** implements the paper's cross-product side test (Eq. 1) plus the minimum-box-area filter (`A_min = 1500 px²`) and minimum track-age rule (`τ_age = 5` frames).
- **Bridge footage:** no public dataset of real footbridge camera footage exists (the paper says so too). The included synthetic video is a stand-in for testing the pipeline; it is not used for training.
- **Backend and dashboard:** a real Flask + SQLite + Chart.js stack.
- **Not implemented:** crossing direction (in vs. out) in the live pipeline, and per-camera calibration. Every live crossing is reported as "in".

---

*Based on the paper "Machine Learning Based Pedestrian Counting and Crowd Monitoring on Bridges Using Computer Vision." Datasets used: Penn-Fudan Pedestrian; optionally MOT20 and Town Centre (download from their official sources and follow their licences).*