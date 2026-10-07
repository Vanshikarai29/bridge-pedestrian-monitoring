"""
End-to-end pipeline: video feed -> YOLOv8 detector -> ByteTrack tracker ->
virtual line-crossing counter -> REST API.

Usage (run from the project root so relative imports resolve -- note the `-m` flag):
    # Live pipeline on a video file, real detector+tracker, posting to the API:
    python -m src.pipeline --source sample_videos/my_bridge_clip.mp4 --weights weights/best.pt

    # Webcam:
    python -m src.pipeline --source 0

    # Higher-resolution inference (better for small/distant pedestrians):
    python -m src.pipeline --source sample_videos/my_bridge_clip.mp4 --weights weights/best.pt --imgsz 960

    # Lower confidence threshold (better for hard-to-see / silhouette pedestrians):
    python -m src.pipeline --source sample_videos/my_bridge_clip.mp4 --weights weights/best.pt --conf 0.2

    # Faster on CPU: process every 2nd frame
    python -m src.pipeline --source sample_videos/my_bridge_clip.mp4 --weights weights/best.pt --vid-stride 2

    # Dry run against the synthetic ground-truth data, no API calls, just prints counts
    # (useful for verifying the counter's math end-to-end without a detector or server):
    python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json --no-api

    # Same, but also POST the resulting events to a running backend:
    python -m src.pipeline --mock-detections sample_videos/synthetic_bridge_ground_truth.json
"""
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

from . import config as cfg
from .tracker_counter import LineCrossingCounter

# NOTE: cv2 and .detector (which imports ultralytics) are imported lazily inside
# run_live_pipeline() rather than at module load time, so that `--mock-detections`
# mode -- which never touches the detector -- doesn't require ultralytics/opencv
# to be installed at all.


def post_crossing_event(api_base_url: str, bridge_id: str, track_id: int, direction: int):
    try:
        resp = requests.post(
            f"{api_base_url}/events/crossing",
            json={
                "bridge_id": bridge_id,
                "track_id": track_id,
                "direction": direction,  # +1 = in, -1 = out (paper's sign convention)
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            timeout=2,
        )
        if resp.status_code >= 300:
            print(f"[api] warning: POST /events/crossing returned {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"[api] could not reach backend at {api_base_url} ({e}). "
              f"Is `python backend/run.py` running? Continuing without posting.")


def run_mock_pipeline(gt_path: str, bridge_id: str, api_base_url: str, use_api: bool):
    """Replay recorded ground-truth boxes (from data/generate_synthetic_bridge_data.py)
    through the line-crossing counter, bypassing the detector/tracker entirely. This
    is how you sanity-check the counting math and the API/dashboard without a real
    camera or a trained model."""
    gt = json.loads(Path(gt_path).read_text())
    line_a = tuple(gt["counting_line"]["a"])
    line_b = tuple(gt["counting_line"]["b"])
    counter = LineCrossingCounter(line_a=line_a, line_b=line_b)

    print(f"Replaying {len(gt['frames'])} frames of ground truth "
          f"(true total crossings = {gt['true_total_crossings']}) ...")

    for frame_data in gt["frames"]:
        frame_idx = frame_data["frame"]
        for box in frame_data["boxes"]:
            crossed = counter.update(box["track_id"], box["bbox"], frame_idx)
            if crossed:
                print(f"  frame {frame_idx}: track {box['track_id']} crossed the line "
                      f"(direction {counter.last_direction:+d}, running total = {counter.total_crossings})")
                if use_api:
                    post_crossing_event(api_base_url, bridge_id, box["track_id"],
                                        direction=counter.last_direction)

    print(f"\nPipeline counted: {counter.total_crossings}")
    print(f"Ground truth:     {gt['true_total_crossings']}")
    match = "MATCH" if counter.total_crossings == gt["true_total_crossings"] else "MISMATCH"
    print(f"Result: {match}")


def run_live_pipeline(source, weights, bridge_id, api_base_url, use_api,
                       line_a=None, line_b=None, display=False,
                       imgsz=None, conf=None, vid_stride=1):
    import cv2  # lazy import -- see note at top of file
    from .detector import load_detector

    imgsz = imgsz or cfg.IMG_SIZE
    conf = cfg.DEFAULT_CONF if conf is None else conf
    model = load_detector(weights)

    cap_probe = cv2.VideoCapture(source if not str(source).isdigit() else int(source))
    ok, frame = cap_probe.read()
    if not ok:
        raise RuntimeError(f"Could not open video source: {source}")
    h, w = frame.shape[:2]
    cap_probe.release()

    # Default counting line: a horizontal line at 60% of the frame height, spanning
    # the full width -- matches the synthetic generator's convention. Override with
    # --line-a / --line-b for a real camera's geometry.
    # Direction: moving across the line towards the side with a positive cross product
    # is "in" (+1). For the default horizontal line that means top -> bottom of the image.
    # To flip it, swap --line-a and --line-b.
    line_a = line_a or (0, int(h * 0.6))
    line_b = line_b or (w, int(h * 0.6))
    counter = LineCrossingCounter(
        line_a=line_a,
        line_b=line_b,
        min_bbox_area=w * h * cfg.MIN_BBOX_AREA_FRACTION,   # scales with resolution
        hysteresis_px=cfg.LINE_HYSTERESIS_PX,
    )

    print(f"Opened source '{source}' ({w}x{h}). Counting line: {line_a} -> {line_b}")
    print(f"Inference settings: imgsz={imgsz}, conf={conf}, vid_stride={vid_stride}, "
          f"min box area={counter.min_bbox_area:.0f} px^2")
    print("Running detector+tracker (Ctrl+C to stop)...")

    frame_idx = 0
    t_start = time.time()
    results_stream = model.track(
        source=source,
        classes=[cfg.PERSON_CLASS_ID],
        tracker=cfg.TRACKER_CFG,
        imgsz=imgsz,
        stream=True,
        persist=True,
        verbose=False,
        conf=conf,
        vid_stride=vid_stride,
    )

    for result in results_stream:
        if result.boxes is not None and result.boxes.id is not None:
            boxes_xyxy = result.boxes.xyxy.cpu().numpy()
            track_ids = result.boxes.id.cpu().numpy().astype(int)
            for bbox, track_id in zip(boxes_xyxy, track_ids):
                crossed = counter.update(int(track_id), bbox.tolist(), frame_idx)
                if crossed:
                    print(f"  frame {frame_idx}: track {track_id} crossed "
                          f"({'in' if counter.last_direction > 0 else 'out'}, "
                          f"in={counter.in_count} out={counter.out_count})")
                    if use_api:
                        post_crossing_event(api_base_url, bridge_id, int(track_id),
                                            direction=counter.last_direction)

        if display:
            annotated = result.plot()
            cv2.line(annotated, line_a, line_b, (0, 0, 255), 2)
            cv2.putText(annotated, f"in: {counter.in_count}  out: {counter.out_count}  "
                                   f"net: {counter.net_count}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            cv2.imshow("Bridge Pedestrian Monitoring", annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        frame_idx += 1

    elapsed = time.time() - t_start
    fps = frame_idx / elapsed if elapsed > 0 else 0
    print(f"\nProcessed {frame_idx} frames in {elapsed:.1f}s ({fps:.1f} FPS)")
    print(f"Total crossings counted: {counter.total_crossings} "
          f"(in={counter.in_count}, out={counter.out_count}, net={counter.net_count})")
    if display:
        cv2.destroyAllWindows()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", help="Video file path, RTSP URL, or webcam index (e.g. 0)")
    ap.add_argument("--weights", default=None, help="Path to trained .pt weights "
                                                      f"(default: weights/best.pt, falls back to stock {cfg.FALLBACK_WEIGHTS})")
    ap.add_argument("--mock-detections", help="Path to a ground-truth JSON from "
                                               "data/generate_synthetic_bridge_data.py; "
                                               "bypasses the detector/tracker entirely")
    ap.add_argument("--bridge-id", default=cfg.DEFAULT_BRIDGE_ID)
    ap.add_argument("--api-url", default=cfg.API_BASE_URL)
    ap.add_argument("--no-api", action="store_true", help="Don't POST events to the backend, just print them")
    ap.add_argument("--display", action="store_true", help="Show an annotated video window (real pipeline only)")
    ap.add_argument("--line-a", type=int, nargs=2, metavar=("X", "Y"), default=None)
    ap.add_argument("--line-b", type=int, nargs=2, metavar=("X", "Y"), default=None)
    ap.add_argument("--imgsz", type=int, default=None,
                     help=f"Inference image size (default: {cfg.IMG_SIZE} from config.py). "
                          f"Use a larger value (e.g. 960) for scenes with small/distant pedestrians.")
    ap.add_argument("--conf", type=float, default=None,
                     help=f"Detection confidence threshold (default: {cfg.DEFAULT_CONF} from config.py). "
                          "Lower it (e.g. 0.2) for hard-to-see / low-light / silhouette pedestrians.")
    ap.add_argument("--vid-stride", type=int, default=1,
                     help="Process every Nth frame (default: 1 = every frame). 2 or 3 speeds up "
                          "CPU runs but can hurt tracking if people move fast.")
    args = ap.parse_args()

    use_api = not args.no_api

    if args.mock_detections:
        run_mock_pipeline(args.mock_detections, args.bridge_id, args.api_url, use_api)
    else:
        if not args.source:
            ap.error("--source is required unless --mock-detections is given")
        run_live_pipeline(
            args.source, args.weights, args.bridge_id, args.api_url, use_api,
            line_a=tuple(args.line_a) if args.line_a else None,
            line_b=tuple(args.line_b) if args.line_b else None,
            display=args.display,
            imgsz=args.imgsz,
            conf=args.conf,
            vid_stride=args.vid_stride,
        )


if __name__ == "__main__":
    main()