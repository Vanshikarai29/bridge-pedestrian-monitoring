"""
16 backend API test cases, matching the paper's Section III-F/G description:
occupancy accounting, alert triggering and clearing, input validation, and
historical-data bucketing.
"""
import json
import time
from datetime import datetime, timedelta, timezone


def post_event(client, bridge_id="bridge-1", track_id=1, direction=1, timestamp=None):
    payload = {"bridge_id": bridge_id, "track_id": track_id, "direction": direction}
    if timestamp is not None:
        payload["timestamp"] = timestamp
    return client.post("/api/events/crossing", json=payload)


# ---------------------------------------------------------------- occupancy accounting
def test_crossing_in_increments_occupancy(client):
    resp = post_event(client, direction=1)
    assert resp.status_code == 201
    assert resp.get_json()["bridge"]["occupancy"] == 1


def test_crossing_out_decrements_occupancy(client):
    post_event(client, direction=1)
    post_event(client, direction=1)
    resp = post_event(client, direction=-1)
    assert resp.get_json()["bridge"]["occupancy"] == 1


def test_occupancy_never_goes_negative(client):
    resp = post_event(client, direction=-1)
    assert resp.get_json()["bridge"]["occupancy"] == 0


def test_unknown_bridge_created_on_first_event(client):
    resp = post_event(client, bridge_id="new-bridge", direction=1)
    assert resp.status_code == 201
    get_resp = client.get("/api/occupancy/new-bridge")
    assert get_resp.status_code == 200
    assert get_resp.get_json()["occupancy"] == 1


def test_occupancy_query_for_nonexistent_bridge_404(client):
    resp = client.get("/api/occupancy/does-not-exist")
    assert resp.status_code == 404


# ---------------------------------------------------------------- alert triggering / clearing
def test_alert_fires_when_occupancy_reaches_threshold(client):
    client.post("/api/threshold/bridge-1", json={"threshold": 3})
    for _ in range(3):
        post_event(client, direction=1)
    resp = client.get("/api/occupancy/bridge-1")
    assert resp.get_json()["alert_active"] is True

    alerts = client.get("/api/alerts/bridge-1").get_json()
    assert len(alerts) == 1
    assert alerts[0]["active"] is True


def test_alert_does_not_duplicate_while_still_over_threshold(client):
    client.post("/api/threshold/bridge-1", json={"threshold": 2})
    for _ in range(5):  # occupancy will overshoot the threshold repeatedly
        post_event(client, direction=1)
    alerts = client.get("/api/alerts/bridge-1").get_json()
    # exactly one alert row for this single overcrowding episode, not five
    assert len(alerts) == 1


def test_alert_clears_when_occupancy_drops_below_threshold(client):
    client.post("/api/threshold/bridge-1", json={"threshold": 2})
    post_event(client, direction=1)
    post_event(client, direction=1)  # occupancy=2, alert fires
    post_event(client, direction=-1)  # occupancy=1, should clear

    resp = client.get("/api/occupancy/bridge-1")
    assert resp.get_json()["alert_active"] is False

    alerts = client.get("/api/alerts/bridge-1").get_json()
    assert alerts[0]["active"] is False
    assert alerts[0]["cleared_at"] is not None


def test_new_alert_after_clear_creates_second_row(client):
    client.post("/api/threshold/bridge-1", json={"threshold": 1})
    post_event(client, direction=1)   # occupancy=1 -> alert #1 fires
    post_event(client, direction=-1)  # occupancy=0 -> alert #1 clears
    post_event(client, direction=1)   # occupancy=1 -> alert #2 fires
    alerts = client.get("/api/alerts/bridge-1").get_json()
    assert len(alerts) == 2


def test_alerts_active_filter(client):
    client.post("/api/threshold/bridge-1", json={"threshold": 1})
    post_event(client, direction=1)
    post_event(client, direction=-1)  # this alert clears
    post_event(client, direction=1)   # this one stays active
    active_only = client.get("/api/alerts/bridge-1?active=true").get_json()
    assert len(active_only) == 1
    assert active_only[0]["active"] is True


# ---------------------------------------------------------------- input validation
def test_missing_bridge_id_rejected(client):
    resp = client.post("/api/events/crossing", json={"track_id": 1, "direction": 1})
    assert resp.status_code == 400


def test_invalid_direction_rejected(client):
    resp = post_event(client, direction=99)
    assert resp.status_code == 400


def test_non_integer_track_id_rejected(client):
    resp = client.post("/api/events/crossing",
                        json={"bridge_id": "bridge-1", "track_id": "abc", "direction": 1})
    assert resp.status_code == 400


def test_invalid_timestamp_rejected(client):
    resp = post_event(client, timestamp="not-a-real-timestamp")
    assert resp.status_code == 400


def test_invalid_threshold_rejected(client):
    resp = client.post("/api/threshold/bridge-1", json={"threshold": -5})
    assert resp.status_code == 400
    resp2 = client.post("/api/threshold/bridge-1", json={"threshold": "many"})
    assert resp2.status_code == 400


# ---------------------------------------------------------------- historical-data bucketing
def test_footfall_buckets_group_by_time_window(client):
    # now = datetime.now(timezone.utc)
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    now = now - timedelta(minutes=now.minute % 5) + timedelta(minutes=1)
    post_event(client, direction=1, timestamp=now.isoformat())
    post_event(client, direction=1, timestamp=(now + timedelta(seconds=30)).isoformat())
    post_event(client, direction=-1, timestamp=(now + timedelta(minutes=6)).isoformat())

    resp = client.get("/api/footfall/bridge-1?bucket_minutes=5&hours=1")
    data = resp.get_json()
    assert resp.status_code == 200
    # the two same-minute-ish events should land in one bucket, the +6min one in another
    assert len(data["buckets"]) == 2
    totals_in = sum(b["in"] for b in data["buckets"])
    totals_out = sum(b["out"] for b in data["buckets"])
    assert totals_in == 2
    assert totals_out == 1


def test_footfall_empty_when_no_events(client):
    resp = client.get("/api/footfall/quiet-bridge?bucket_minutes=5&hours=1")
    assert resp.status_code == 200
    assert resp.get_json()["buckets"] == []
