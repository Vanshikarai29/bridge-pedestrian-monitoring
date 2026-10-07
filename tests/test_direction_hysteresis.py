from src.tracker_counter import LineCrossingCounter


def box(cx, cy, w=20, h=40):
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]


def make(**kw):
    # horizontal line y=100; "below" the line (y>100) is the +1 side
    return LineCrossingCounter(line_a=(0, 100), line_b=(200, 100),
                               min_bbox_area=0, track_age_threshold=0, **kw)


def test_direction_in_and_out():
    c = make()
    assert not c.update(1, box(100, 50), 0)
    assert c.update(1, box(100, 150), 1)          # top -> bottom = in
    assert c.last_direction == 1
    assert not c.update(2, box(100, 150), 0)
    assert c.update(2, box(100, 50), 1)           # bottom -> top = out
    assert c.last_direction == -1
    assert (c.in_count, c.out_count, c.net_count, c.total_crossings) == (1, 1, 0, 2)


def test_no_crossing_resets_last_direction():
    c = make()
    c.update(1, box(100, 50), 0)
    c.update(1, box(100, 150), 1)
    assert c.last_direction == 1
    c.update(1, box(100, 160), 2)
    assert c.last_direction == 0


def test_jitter_on_line_counts_many_times_without_hysteresis():
    c = make()
    for i, y in enumerate([50, 104, 96, 104, 150]):
        c.update(1, box(100, y), i)
    assert c.total_crossings == 3


def test_hysteresis_counts_jitter_once():
    c = make(hysteresis_px=10)
    for i, y in enumerate([50, 104, 96, 104, 150]):
        c.update(1, box(100, y), i)
    assert c.total_crossings == 1
    assert c.in_count == 1
    