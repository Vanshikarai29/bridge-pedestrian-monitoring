Put your trained weights file here as `best.pt`.

Train it on Google Colab or Kaggle using `notebooks/train_yolov8.ipynb` (see the main
README's "Train the detector on Colab or Kaggle" section) -- that notebook's last cell
downloads a `best.pt` file for you.

If this folder is empty, `src/detector.py` automatically falls back to the stock
COCO-pretrained `yolov8n.pt` (Ultralytics downloads it on first use) so the rest of the
pipeline still runs -- it just won't have the paper's fine-tuned accuracy.
