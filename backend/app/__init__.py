"""Flask app factory: wires up SQLite, the REST API blueprint, and the React dashboard."""
from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS

from .models import db
from .routes import api as api_blueprint

PROJECT_ROOT  = Path(__file__).resolve().parents[2]
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
REACT_BUILD   = DASHBOARD_DIR / "static" / "react"
LEGACY_STATIC = DASHBOARD_DIR / "static"


def create_app(db_path: str | None = None, testing: bool = False) -> Flask:
    app = Flask(__name__, static_folder=None)
    CORS(app)

    if testing:
        db_uri = "sqlite:///:memory:"
    else:
        db_path = db_path or str(PROJECT_ROOT / "backend" / "bridge_monitoring.db")
        db_uri = f"sqlite:///{db_path}"

    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = testing

    db.init_app(app)
    app.register_blueprint(api_blueprint)

    with app.app_context():
        db.create_all()

    # ── Static assets from the React build ──────────────────────────────────
    @app.route("/assets/<path:filename>")
    def react_assets(filename):
        return send_from_directory(REACT_BUILD / "assets", filename)

    # ── SPA catch-all: serve React index.html for every non-API route ───────
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path):
        react_index = REACT_BUILD / "index.html"
        if react_index.exists():
            return send_from_directory(str(REACT_BUILD), "index.html")

        # Fallback: old vanilla dashboard (served from dashboard/templates/)
        from flask import render_template
        app.template_folder = str(DASHBOARD_DIR / "templates")
        app.static_folder   = str(LEGACY_STATIC)
        app.static_url_path = "/static"
        return render_template("index.html")

    return app
