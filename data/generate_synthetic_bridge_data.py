"""
No public dataset of real footbridge CCTV footage exists (the paper says so explicitly
in its Limitations section) so this script *manually creates* one: a procedurally
rendered video of a narrow elevated walkway with animated pedestrians crossing a
counting line at a scripted, known rate.

It writes two files:
  1. sample_videos/synthetic_bridge.mp4               - the video itself
  2. sample_videos/synthetic_bridge_ground_truth.json  - exact per-frame bounding boxes
                                                          and track IDs for every synthetic
                                                          pedestrian, plus the true total
                                                          crossing count.

Why a ground-truth JSON instead of just a video: a real YOLO detector will NOT reliably
detect simple drawn/cartoon figures as "person" (it was trained on real photos), so this
video is not useful for testing the *detector*. What it IS useful for is testing everything
downstream of detection -- the tracker, the line-crossing counter's math, the REST API, and
the dashboard -- by replaying the ground-truth boxes directly. See `src/pipeline.py --mock-detections`.

Usage:
    python data/generate_synthetic_bridge_data.py
    python data/generate_synthetic_bridge_data.py --pedestrians 14 --seconds 30 --seed 7
"""
import argparse
import json
import math
import random
from pathlib import Path

import cv2
import numpy as np

WIDTH, HEIGHT = 960, 540
FPS = 20


def draw_bridge_background(frame):
    """Draw a simple elevated-walkway scene: sky, deck with perspective, railings."""
    # sky
    frame[:, :] = (235, 219, 195)  # light blue-grey (BGR)
    # deck (perspective trapezoid)
    deck_pts = np.array([
        [int(WIDTH * 0.30), 0], [int(WIDTH * 0.70), 0],
        [WIDTH, HEIGHT], [0, HEIGHT],
    ], dtype=np.int32)
    cv2.fillPoly(frame, [deck_pts], (150, 150, 150))
    # deck expansion joints (perspective lines)
    for t in np.linspace(0.05, 0.95, 10):
        y = int(t * HEIGHT)
        x_left = int(np.interp(y, [0, HEIGHT], [WIDTH * 0.30, 0]))
        x_right = int(np.interp(y, [0, HEIGHT], [WIDTH * 0.70, WIDTH]))
        cv2.line(frame, (x_left, y), (x_right, y), (130, 130, 130), 1)
    # railings
    cv2.line(frame, (int(WIDTH * 0.30), 0), (0, HEIGHT), (60, 60, 60), 6)
    cv2.line(frame, (int(WIDTH * 0.70), 0), (WIDTH, HEIGHT), (60, 60, 60), 6)
    return frame


def draw_person(frame, cx, cy, scale, color):
    """Draw a simple stick figure centred at (cx, cy). Returns its bounding box (x1,y1,x2,y2).
    Sized so that a pedestrian near the counting line clears the pipeline's default
    A_min=1500px^2 filter (matching a real bridge camera, where anyone near enough
    to cross the counting line fills a non-trivial part of the frame)."""
    head_r = int(13 * scale)
    body_h = int(48 * scale)
    body_w = int(22 * scale)

    top = cy - body_h // 2 - head_r * 2
    cv2.circle(frame, (cx, top + head_r), head_r, color, -1)
    x1 = cx - body_w // 2
    y1 = top + head_r * 2
    x2 = cx + body_w // 2
    y2 = y1 + body_h
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, -1)

    bx1 = cx - body_w // 2 - 2
    bx2 = cx + body_w // 2 + 2
    by1 = top
    by2 = y2
    return bx1, by1, bx2, by2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default="sample_videos")
    ap.add_argument("--pedestrians", type=int, default=10, help="Total number of pedestrians to spawn")
    ap.add_argument("--seconds", type=int, default=25)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    video_path = out_dir / "synthetic_bridge.mp4"
    gt_path = out_dir / "synthetic_bridge_ground_truth.json"

    n_frames = args.seconds * FPS

    # The counting line: a horizontal line across the deck at 60% height, matching the
    # paper's virtual-line-crossing convention (a=(xa,ya), b=(xb,yb)).
    line_a = (0, int(HEIGHT * 0.6))
    line_b = (WIDTH, int(HEIGHT * 0.6))

    # Schedule pedestrians: stagger start times/frames, alternate direction, randomize
    # horizontal lane and walking speed so tracks don't all overlap identically.
    pedestrians = []
    spawn_gap = max(1, n_frames // (args.pedestrians + 1))
    for i in range(args.pedestrians):
        direction = 1 if i % 2 == 0 else -1  # 1 = walking "down" the deck, -1 = "up"
        start_frame = spawn_gap * (i + 1) + random.randint(-5, 5)
        lane_x = int(WIDTH * random.uniform(0.35, 0.65))
        speed = random.uniform(2.6, 3.6)  # px/frame in the perspective (deck) direction
        color = tuple(int(c) for c in np.random.randint(40, 200, size=3))
        pedestrians.append(dict(
            track_id=i + 1,
            direction=direction,
            start_frame=max(0, start_frame),
            lane_x=lane_x,
            speed=speed,
            color=color,
            crossed=False,
        ))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(video_path), fourcc, FPS, (WIDTH, HEIGHT))

    ground_truth_frames = []
    true_crossing_count = 0

    for frame_idx in range(n_frames):
        frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        draw_bridge_background(frame)
        cv2.line(frame, line_a, line_b, (0, 0, 220), 2)

        frame_boxes = []
        for p in pedestrians:
            t = frame_idx - p["start_frame"]
            if t < 0:
                continue
            # walk from one end of the deck (y=0) to the other (y=HEIGHT) or reverse
            if p["direction"] == 1:
                y = t * p["speed"] * (HEIGHT / (n_frames * 1.4))
                y = min(y, HEIGHT + 40)
            else:
                y = HEIGHT - t * p["speed"] * (HEIGHT / (n_frames * 1.4))
                y = max(y, -40)
            if y < -40 or y > HEIGHT + 40:
                continue  # off-screen, walked all the way through

            # perspective scale: smaller near the top (far end) of the deck
            scale = np.interp(y, [0, HEIGHT], [0.5, 1.6])
            cx = p["lane_x"] + int(6 * math.sin(frame_idx * 0.15 + p["track_id"]))
            cy = int(np.clip(y, 0, HEIGHT))

            x1, y1, x2, y2 = draw_person(frame, cx, cy, scale, p["color"])
            frame_boxes.append(dict(track_id=p["track_id"], bbox=[int(x1), int(y1), int(x2), int(y2)]))

            # ground-truth crossing test, mirrors the paper's Eq. (1) sign-change rule,
            # evaluated on the bbox centroid
            centroid_y = (y1 + y2) / 2
            prev_side = getattr_side(p, "prev_side", None)
            cur_side = 1 if centroid_y > line_a[1] else -1
            if prev_side is not None and prev_side != cur_side and not p["crossed"]:
                true_crossing_count += 1
                p["crossed"] = True
            p["prev_side"] = cur_side

        cv2.putText(frame, f"Frame {frame_idx}  |  True crossings so far: {true_crossing_count}",
                    (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 1, cv2.LINE_AA)

        writer.write(frame)
        ground_truth_frames.append(dict(frame=frame_idx, boxes=frame_boxes))

    writer.release()

    ground_truth = dict(
        video=str(video_path.name),
        width=WIDTH, height=HEIGHT, fps=FPS,
        counting_line={"a": list(line_a), "b": list(line_b)},
        true_total_crossings=true_crossing_count,
        num_pedestrians_spawned=args.pedestrians,
        frames=ground_truth_frames,
    )
    gt_path.write_text(json.dumps(ground_truth))

    print(f"Wrote video:        {video_path}  ({n_frames} frames, {n_frames / FPS:.1f}s)")
    print(f"Wrote ground truth: {gt_path}")
    print(f"True total line crossings (ground truth): {true_crossing_count}")
    print("\nRun the pipeline against this with (from the project root):")
    print(f"  python -m src.pipeline --mock-detections {gt_path} --no-api  # dry run, prints counts")
    print(f"  python -m src.pipeline --mock-detections {gt_path}           # posts events to the API")


def getattr_side(p, key, default):
    return p.get(key, default)


if __name__ == "__main__":
    main()
