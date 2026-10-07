"""
Compare detector weights on the same video: crossing counts, tracking stability, speed,
and (optionally) the error against a manual count you did by eye.

Run from the project root:

    python -m src.compare_models --source "sample_videos/clip.mp4" --vid-stride 2 \
        --model nano=weights/best_nano.pt@320 \
        --model large=weights/best.pt@640 \
        --manual-in 5 --manual-out 6

--model takes  name=path_to_weights@imgsz  (use the image size each model was trained at).
Use the same --line-a / --line-b you used when counting by hand.
"""
import argparse
import time

from . import config as cfg
from .tracker_counter import LineCrossingCounter


def parse_model_spec(spec: str):
    """'large=weights/best.pt@640' -> ('large', 'weights/best.pt', 640)"""
    name, rest = spec.split("=", 1)
    path, imgsz = rest.rsplit("@", 1)   # rsplit so Windows paths like D:\x\best.pt are fine
    return name, path, int(imgsz)


def evaluate(name, weights, imgsz, source, conf, vid_stride, line_a=None, line_b=None):
    import cv2  # lazy import, same as pipeline.py
    from .detector import load_detector

    model = load_detector(weights)

    cap = cv2.VideoCapture(source if not str(source).isdigit() else int(source))
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError(f"Could not open video source: {source}")
    h, w = frame.shape[:2]
    cap.release()

    la = line_a or (0, int(h * 0.6))
    lb = line_b or (w, int(h * 0.6))
    counter = LineCrossingCounter(
        line_a=la, line_b=lb,
        min_bbox_area=w * h * cfg.MIN_BBOX_AREA_FRACTION,
        hysteresis_px=cfg.LINE_HYSTERESIS_PX,
    )

    frames = 0
    detections = 0
    track_ids_seen = set()
    t0 = time.time()
    stream = model.track(
        source=source, classes=[cfg.PERSON_CLASS_ID], tracker=cfg.TRACKER_CFG,
        imgsz=imgsz, stream=True, persist=True, verbose=False,
        conf=conf, vid_stride=vid_stride,
    )
    for result in stream:
        if result.boxes is not None:
            detections += len(result.boxes)
            if result.boxes.id is not None:
                boxes = result.boxes.xyxy.cpu().numpy()
                ids = result.boxes.id.cpu().numpy().astype(int)
                for bbox, tid in zip(boxes, ids):
                    track_ids_seen.add(int(tid))
                    counter.update(int(tid), bbox.tolist(), frames)
        frames += 1
    elapsed = time.time() - t0

    return {
        "name": name, "imgsz": imgsz, "frames": frames,
        "in": counter.in_count, "out": counter.out_count, "total": counter.total_crossings,
        "avg_det": detections / frames if frames else 0.0,
        "unique_ids": len(track_ids_seen),
        "fps": frames / elapsed if elapsed > 0 else 0.0,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True)
    ap.add_argument("--model", action="append", required=True, metavar="NAME=PATH@IMGSZ",
                    help="repeatable, e.g. nano=weights/best_nano.pt@320")
    ap.add_argument("--conf", type=float, default=cfg.DEFAULT_CONF)
    ap.add_argument("--vid-stride", type=int, default=1)
    ap.add_argument("--line-a", type=int, nargs=2, metavar=("X", "Y"), default=None)
    ap.add_argument("--line-b", type=int, nargs=2, metavar=("X", "Y"), default=None)
    ap.add_argument("--manual-in", type=int, default=None, help="people you counted going 'in' by eye")
    ap.add_argument("--manual-out", type=int, default=None, help="people you counted going 'out' by eye")
    args = ap.parse_args()

    rows = []
    for spec in args.model:
        name, path, imgsz = parse_model_spec(spec)
        print(f"Running {name} ({path}, imgsz={imgsz}) ...")
        rows.append(evaluate(
            name, path, imgsz, args.source, args.conf, args.vid_stride,
            tuple(args.line_a) if args.line_a else None,
            tuple(args.line_b) if args.line_b else None,
        ))

    have_manual = args.manual_in is not None and args.manual_out is not None
    print()
    header = f"{'model':<10}{'imgsz':>6}{'in':>5}{'out':>5}{'total':>7}{'det/frame':>11}{'track IDs':>11}{'FPS':>6}"
    if have_manual:
        header += f"{'err_in':>8}{'err_out':>9}{'err_total':>11}"
    print(header)
    print("-" * len(header))
    for r in rows:
        line = (f"{r['name']:<10}{r['imgsz']:>6}{r['in']:>5}{r['out']:>5}{r['total']:>7}"
                f"{r['avg_det']:>11.1f}{r['unique_ids']:>11}{r['fps']:>6.1f}")
        if have_manual:
            e_in = abs(r["in"] - args.manual_in)
            e_out = abs(r["out"] - args.manual_out)
            e_tot = abs(r["total"] - (args.manual_in + args.manual_out))
            line += f"{e_in:>8}{e_out:>9}{e_tot:>11}"
        print(line)
    if have_manual:
        print(f"\nManual count: in={args.manual_in}, out={args.manual_out}, "
              f"total={args.manual_in + args.manual_out}. Smaller err_* = better.")
    print("Tip: far fewer 'track IDs' for the same people usually means steadier tracking "
          "(fewer ID switches that cause false crossings).")


if __name__ == "__main__":
    main()