"""
Virtual line-crossing counter.

Implements the exact rule from the paper's Section III-C / Eq. (1):

    For a configurable virtual line with endpoints a=(xa,ya), b=(xb,yb), and a tracked
    pedestrian centroid p_t=(x_t,y_t) at frame t, which side of the line the pedestrian
    is on is given by the sign of the 2D cross product:

        d_t = sgn[(x_b - x_a)(y_t - y_a) - (y_b - y_a)(x_t - x_a)]

    A crossing event fires on frame t when d_t != d_{t-1} AND the track's active duration
    satisfies t_track >= tau_age (a minimum track-age threshold that stops a track that has
    only just appeared, and may be spurious, from registering a crossing).

    A second guard, a minimum bounding-box-area filter A_min, discards detections below a
    set pixel area before the cross-product check runs at all -- this addresses small/distant
    false detections churning through many track identities (Section IV-B).

Extensions over the paper (all backwards compatible):

    * Direction: when a crossing fires, `last_direction` is set to the NEW side d_t.
      Moving from the -1 side to the +1 side is "in" (+1); the reverse is "out" (-1).
      `in_count`, `out_count` and `net_count` keep running totals.
    * Hysteresis: with `hysteresis_px > 0`, a centroid closer than that many pixels to
      the line counts as "on the line" and is ignored. A person standing or jittering on
      the line is therefore no longer counted over and over. Default 0 = paper behaviour.

The tracking itself (assigning stable track IDs across frames, including through brief
occlusion) is delegated to Ultralytics' built-in ByteTrack implementation
(see src/pipeline.py, which calls model.track(..., tracker='bytetrack.yaml')). This module
only implements the counting logic that sits on top of already-tracked boxes -- it is
detector/tracker agnostic and unit-testable in isolation (see tests/test_line_counter.py).
"""
import math
from dataclasses import dataclass, field

from . import config as cfg


def _sign(x: float) -> int:
    if x > 0:
        return 1
    if x < 0:
        return -1
    return 0


def bbox_area(bbox) -> float:
    x1, y1, x2, y2 = bbox
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def bbox_centroid(bbox):
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


@dataclass
class _TrackState:
    first_seen_frame: int
    prev_side: int | None = None
    total_crossings: int = 0


@dataclass
class LineCrossingCounter:
    """Stateful counter: feed it (track_id, bbox, frame_idx) tuples frame by frame,
    it tells you when a crossing event fires."""

    line_a: tuple[float, float]
    line_b: tuple[float, float]
    min_bbox_area: float = cfg.MIN_BBOX_AREA_PX2
    track_age_threshold: int = cfg.TRACK_AGE_THRESHOLD_FRAMES
    hysteresis_px: float = 0.0
    _tracks: dict = field(default_factory=dict)
    in_count: int = 0
    out_count: int = 0
    last_direction: int = 0   # +1 / -1 for the most recent update() call that crossed, else 0

    def reset(self):
        self._tracks.clear()
        self.in_count = 0
        self.out_count = 0
        self.last_direction = 0

    def update(self, track_id: int, bbox, frame_idx: int) -> bool:
        """Process one (track_id, bbox) observation at the given frame index.
        Returns True iff this observation triggered a new line-crossing event.
        After a True return, `last_direction` holds +1 (in) or -1 (out)."""
        self.last_direction = 0

        # Guard 1: minimum bounding-box area filter (A_min) -- discard small/distant
        # detections before they ever reach the cross-product check.
        if bbox_area(bbox) < self.min_bbox_area:
            return False

        state = self._tracks.get(track_id)
        if state is None:
            state = _TrackState(first_seen_frame=frame_idx)
            self._tracks[track_id] = state

        cx, cy = bbox_centroid(bbox)
        xa, ya = self.line_a
        xb, yb = self.line_b
        cross = (xb - xa) * (cy - ya) - (yb - ya) * (cx - xa)

        # Guard 2 (extension): dead zone around the line. A centroid within
        # `hysteresis_px` of the line gets side 0 and is ignored below.
        length = math.hypot(xb - xa, yb - ya) or 1.0
        if abs(cross) / length < self.hysteresis_px:
            d_t = 0
        else:
            d_t = _sign(cross)

        crossed = False
        track_age = frame_idx - state.first_seen_frame
        if (
            state.prev_side is not None
            and d_t != 0
            and d_t != state.prev_side
            and track_age >= self.track_age_threshold
        ):
            state.total_crossings += 1
            crossed = True
            self.last_direction = d_t
            if d_t > 0:
                self.in_count += 1
            else:
                self.out_count += 1

        if d_t != 0:
            state.prev_side = d_t

        return crossed

    @property
    def total_crossings(self) -> int:
        return sum(t.total_crossings for t in self._tracks.values())

    @property
    def net_count(self) -> int:
        """in minus out (what occupancy should change by)."""
        return self.in_count - self.out_count

    @property
    def active_track_count(self) -> int:
        return len(self._tracks)