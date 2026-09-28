"""Flask app factory: wires up SQLite, the REST API blueprint, and the dashboard."""
from pathlib import Path

from flask import Flask, render_template
from flask_cors import CORS

from .models import db
from .routes import api

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"


def create_app(db_path: str | None = None, testing: bool = False) -> Flask:
    app = Flask(
        __name__,
        template_folder=str(DASHBOARD_DIR / "templates"),
        static_folder=str(DASHBOARD_DIR / "static"),
    )
    CORS(app)  # dashboard talks to the API only, but this keeps local dev friction-free

    if testing:
        db_uri = "sqlite:///:memory:"
    else:
        db_path = db_path or str(PROJECT_ROOT / "backend" / "bridge_monitoring.db")
        db_uri = f"sqlite:///{db_path}"

    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = testing

    db.init_app(app)
    app.register_blueprint(api)

    with app.app_context():
        db.create_all()

    @app.route("/")
    def dashboard():
        return render_template("index.html")

    return app
