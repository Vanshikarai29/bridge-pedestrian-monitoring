"""
7 line-crossing logic test cases, matching the paper's Section III-G description:
single and repeated crossings, independence between simultaneous tracks, and the
track-age suppression rule from Section III-C.

Test geometry: a horizontal line a=(0,100) -> b=(200,100). A bbox centered above
y=100 is on the "-1" side; below y=100 is the "+1" side (see the sign convention
inside src/tracker_counter.py, which mirrors the paper's Eq. 1 exactly).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.tracker_counter import LineCrossingCounter  # noqa: E402

LINE_A = (0, 100)
LINE_B = (200, 100)


def make_counter(**kwargs):
    return LineCrossingCounter(line_a=LINE_A, line_b=LINE_B, **kwargs)


def box_at(cy, cx=100, w=40, h=60):
    """A bbox of the given size centred at (cx, cy). Default size (40x60=2400px^2)
    comfortably clears the default A_min=1500px^2 filter."""
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]


# 1. single crossing registers exactly once
def test_single_crossing_registers_once():
    counter = make_counter(track_age_threshold=0)
    assert counter.update(1, box_at(60), frame_idx=0) is False   # above the line
    assert counter.update(1, box_at(140), frame_idx=1) is True   # crosses below -> counts
    assert counter.total_crossings == 1


# 2. a track that never crosses the line never counts
def test_track_that_never_crosses_does_not_count():
    counter = make_counter(track_age_threshold=0)
    for frame, cy in enumerate([50, 55, 60, 58, 52]):
        assert counter.update(1, box_at(cy), frame_idx=frame) is False
    assert counter.total_crossings == 0


# 3. a track that crosses back and forth counts each individual crossing
def test_repeated_crossing_by_same_track_counts_each_time():
    counter = make_counter(track_age_threshold=0)
    counter.update(1, box_at(60), frame_idx=0)   # above
    c1 = counter.update(1, box_at(140), frame_idx=1)  # -> below, crossing #1
    c2 = counter.update(1, box_at(60), frame_idx=2)   # -> above, crossing #2
    c3 = counter.update(1, box_at(140), frame_idx=3)  # -> below, crossing #3
    assert (c1, c2, c3) == (True, True, True)
    assert counter.total_crossings == 3


# 4. simultaneous tracks are counted independently of one another
def test_simultaneous_tracks_counted_independently():
    counter = make_counter(track_age_threshold=0)
    # track 1 crosses downward, track 2 stays put, track 3 crosses downward too
    counter.update(1, box_at(60, cx=50), frame_idx=0)
    counter.update(2, box_at(60, cx=150), frame_idx=0)
    counter.update(3, box_at(60, cx=100), frame_idx=0)

    c1 = counter.update(1, box_at(140, cx=50), frame_idx=1)
    c2 = counter.update(2, box_at(60, cx=150), frame_idx=1)   # track 2 doesn't move
    c3 = counter.update(3, box_at(140, cx=100), frame_idx=1)

    assert c1 is True
    assert c2 is False
    assert c3 is True
    assert counter.total_crossings == 2
    assert counter.active_track_count == 3


# 5. a bounding box smaller than A_min is filtered out and can never register a crossing
def test_small_bbox_filtered_by_min_area():
    counter = make_counter(track_age_threshold=0, min_bbox_area=1500)
    tiny_box_above = [95, 95, 100, 100]   # 5x5 = 25 px^2, far under 1500
    tiny_box_below = [95, 135, 100, 140]
    assert counter.update(1, tiny_box_above, frame_idx=0) is False
    assert counter.update(1, tiny_box_below, frame_idx=1) is False
    assert counter.total_crossings == 0


# 6. the track-age threshold (tau_age) suppresses a crossing from a track that
# only just appeared -- it must not count even though the geometry says it crossed
def test_track_age_threshold_suppresses_early_crossing():
    counter = make_counter(track_age_threshold=5)
    counter.update(1, box_at(60), frame_idx=0)          # track born at frame 0
    crossed = counter.update(1, box_at(140), frame_idx=2)  # age = 2, under threshold of 5
    assert crossed is False
    assert counter.total_crossings == 0


# 7. once a track has aged past tau_age, the same geometric crossing DOES count
def test_track_age_threshold_allows_crossing_after_minimum_age():
    counter = make_counter(track_age_threshold=5)
    counter.update(1, box_at(60), frame_idx=0)  # track born at frame 0, stays above the line
    for frame in range(1, 6):
        counter.update(1, box_at(60), frame_idx=frame)
    crossed = counter.update(1, box_at(140), frame_idx=6)  # age = 6, over threshold of 5
    assert crossed is True
    assert counter.total_crossings == 1
