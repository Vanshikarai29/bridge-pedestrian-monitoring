from ultralytics import YOLO

# Aapka fine-tuned model
model_custom = YOLO("weights/best.pt")
results_custom = model_custom.predict(
    "sample_videos/gettyimages-495766600-640_adpp.mp4",
    conf=0.1, imgsz=320, save=True, name="custom_test"
)

# Stock COCO-pretrained model
model_stock = YOLO("yolov8n.pt")
results_stock = model_stock.predict(
    "sample_videos/gettyimages-495766600-640_adpp.mp4",
    conf=0.1, imgsz=320, classes=[0], save=True, name="stock_test"
)

# High-res test
results_highres = model_custom.predict(
    "sample_videos/gettyimages-495766600-640_adpp.mp4",
    conf=0.1, imgsz=960, save=True, name="highres_test"
)