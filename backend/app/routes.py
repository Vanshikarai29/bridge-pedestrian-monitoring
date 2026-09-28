"""
REST API matching the paper's Section III-D description: endpoints for event ingestion,
live occupancy queries, historical footfall retrieval, alert listing, and threshold
configuration.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from .models import Alert, Bridge, CrossingEvent, db, utcnow

api = Blueprint("api", __name__, url_prefix="/api")


def _get_or_create_bridge(bridge_id: str) -> Bridge:
    bridge = db.session.get(Bridge, bridge_id)
    if bridge is None:
        bridge = Bridge(id=bridge_id, name=bridge_id)
        db.session.add(bridge)
        db.session.flush()
    return bridge


# ---------------------------------------------------------------- ingestion
@api.route("/events/crossing", methods=["POST"])
def post_crossing_event():
    payload = request.get_json(silent=True) or {}

    bridge_id = payload.get("bridge_id")
    track_id = payload.get("track_id")
    direction = payload.get("direction")

    if not bridge_id or not isinstance(bridge_id, str):
        return jsonify(error="bridge_id (string) is required"), 400
    if track_id is None or not isinstance(track_id, int):
        return jsonify(error="track_id (integer) is required"), 400
    if direction not in (1, -1):
        return jsonify(error="direction must be 1 (in) or -1 (out)"), 400

    ts_raw = payload.get("timestamp")
    if ts_raw:
        try:
            timestamp = datetime.fromisoformat(ts_raw)
        except ValueError:
            return jsonify(error="timestamp must be ISO-8601"), 400
    else:
        timestamp = utcnow()

    bridge = _get_or_create_bridge(bridge_id)

    event = CrossingEvent(bridge_id=bridge_id, track_id=track_id,
                           direction=direction, timestamp=timestamp)
    db.session.add(event)

    bridge.occupancy = max(0, bridge.occupancy + direction)
    bridge.updated_at = utcnow()

    # Alert logic: fires the first time occupancy >= threshold, clears automatically
    # once it drops back below -- a single overcrowding episode produces exactly one
    # alert row rather than one per frame.
    active_alert = Alert.query.filter_by(bridge_id=bridge_id, cleared_at=None).first()
    if bridge.occupancy >= bridge.threshold and active_alert is None:
        active_alert = Alert(bridge_id=bridge_id, occupancy_at_alert=bridge.occupancy,
                              threshold_at_alert=bridge.threshold)
        db.session.add(active_alert)
        bridge.alert_active = True
    elif bridge.occupancy < bridge.threshold and active_alert is not None:
        active_alert.cleared_at = utcnow()
        bridge.alert_active = False

    db.session.commit()

    return jsonify(event=event.to_dict(), bridge=bridge.to_dict()), 201


# ---------------------------------------------------------------- occupancy
@api.route("/occupancy/<bridge_id>", methods=["GET"])
def get_occupancy(bridge_id):
    bridge = db.session.get(Bridge, bridge_id)
    if bridge is None:
        return jsonify(error="unknown bridge_id"), 404
    return jsonify(bridge.to_dict())


@api.route("/bridges", methods=["GET"])
def list_bridges():
    bridges = Bridge.query.all()
    return jsonify([b.to_dict() for b in bridges])


# ---------------------------------------------------------------- footfall (historical)
@api.route("/footfall/<bridge_id>", methods=["GET"])
def get_footfall(bridge_id):
    """Historical footfall, bucketed into fixed-size time windows.
    Query params: bucket_minutes (default 5), hours (default 1, how far back to look)."""
    try:
        bucket_minutes = int(request.args.get("bucket_minutes", 5))
        hours = float(request.args.get("hours", 1))
    except ValueError:
        return jsonify(error="bucket_minutes and hours must be numeric"), 400
    if bucket_minutes <= 0 or hours <= 0:
        return jsonify(error="bucket_minutes and hours must be positive"), 400

    since = utcnow() - timedelta(hours=hours)
    events = (
        CrossingEvent.query
        .filter(CrossingEvent.bridge_id == bridge_id, CrossingEvent.timestamp >= since)
        .order_by(CrossingEvent.timestamp.asc())
        .all()
    )

    buckets = defaultdict(lambda: {"in": 0, "out": 0})
    bucket_size = timedelta(minutes=bucket_minutes)
    for ev in events:
        # bucket key = window start, floor(timestamp) to bucket_size since epoch
        epoch = ev.timestamp.replace(tzinfo=timezone.utc) if ev.timestamp.tzinfo is None else ev.timestamp
        bucket_index = int(epoch.timestamp() // (bucket_size.total_seconds()))
        bucket_start = datetime.fromtimestamp(bucket_index * bucket_size.total_seconds(), tz=timezone.utc)
        key = bucket_start.isoformat()
        if ev.direction == 1:
            buckets[key]["in"] += 1
        else:
            buckets[key]["out"] += 1

    series = [
        {"bucket_start": k, "in": v["in"], "out": v["out"], "net": v["in"] - v["out"]}
        for k, v in sorted(buckets.items())
    ]
    return jsonify(bridge_id=bridge_id, bucket_minutes=bucket_minutes, buckets=series)


# ---------------------------------------------------------------- alerts
@api.route("/alerts/<bridge_id>", methods=["GET"])
def list_alerts(bridge_id):
    only_active = request.args.get("active") == "true"
    query = Alert.query.filter_by(bridge_id=bridge_id)
    if only_active:
        query = query.filter_by(cleared_at=None)
    alerts = query.order_by(Alert.started_at.desc()).all()
    return jsonify([a.to_dict() for a in alerts])


# ---------------------------------------------------------------- threshold config
@api.route("/threshold/<bridge_id>", methods=["POST"])
def set_threshold(bridge_id):
    payload = request.get_json(silent=True) or {}
    threshold = payload.get("threshold")
    if not isinstance(threshold, int) or threshold <= 0:
        return jsonify(error="threshold must be a positive integer"), 400

    bridge = _get_or_create_bridge(bridge_id)
    bridge.threshold = threshold
    bridge.updated_at = utcnow()
    db.session.commit()
    return jsonify(bridge.to_dict())


@api.route("/threshold/<bridge_id>", methods=["GET"])
def get_threshold(bridge_id):
    bridge = db.session.get(Bridge, bridge_id)
    if bridge is None:
        return jsonify(error="unknown bridge_id"), 404
    return jsonify(bridge_id=bridge_id, threshold=bridge.threshold)


# ---------------------------------------------------------------- admin/testing helper
@api.route("/reset/<bridge_id>", methods=["POST"])
def reset_bridge(bridge_id):
    """Not part of the paper's spec, but handy for tests/demos: zero out occupancy
    and clear events for one bridge without dropping the whole database."""
    bridge = db.session.get(Bridge, bridge_id)
    if bridge is not None:
        bridge.occupancy = 0
        bridge.alert_active = False
    CrossingEvent.query.filter_by(bridge_id=bridge_id).delete()
    Alert.query.filter_by(bridge_id=bridge_id).delete()
    db.session.commit()
    return jsonify(status="reset", bridge_id=bridge_id)
