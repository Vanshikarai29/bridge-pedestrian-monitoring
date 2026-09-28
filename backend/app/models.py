"""SQLite schema via SQLAlchemy. Matches the paper's description: crossing events,
running occupancy counters per bridge, alerts, and configurable thresholds."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class Bridge(db.Model):
    __tablename__ = "bridges"

    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(128), nullable=False, default="")
    occupancy = db.Column(db.Integer, nullable=False, default=0)
    threshold = db.Column(db.Integer, nullable=False, default=40)
    alert_active = db.Column(db.Boolean, nullable=False, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "bridge_id": self.id,
            "name": self.name,
            "occupancy": self.occupancy,
            "threshold": self.threshold,
            "alert_active": self.alert_active,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CrossingEvent(db.Model):
    __tablename__ = "crossing_events"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bridge_id = db.Column(db.String(64), db.ForeignKey("bridges.id"), nullable=False, index=True)
    track_id = db.Column(db.Integer, nullable=False)
    direction = db.Column(db.Integer, nullable=False)  # +1 = in, -1 = out
    timestamp = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "bridge_id": self.bridge_id,
            "track_id": self.track_id,
            "direction": self.direction,
            "timestamp": self.timestamp.isoformat(),
        }


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bridge_id = db.Column(db.String(64), db.ForeignKey("bridges.id"), nullable=False, index=True)
    occupancy_at_alert = db.Column(db.Integer, nullable=False)
    threshold_at_alert = db.Column(db.Integer, nullable=False)
    started_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    cleared_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "bridge_id": self.bridge_id,
            "occupancy_at_alert": self.occupancy_at_alert,
            "threshold_at_alert": self.threshold_at_alert,
            "started_at": self.started_at.isoformat(),
            "cleared_at": self.cleared_at.isoformat() if self.cleared_at else None,
            "active": self.cleared_at is None,
        }
