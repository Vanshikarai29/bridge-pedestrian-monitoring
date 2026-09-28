"""Entry point: `python backend/run.py`"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # allow `from backend.app import ...`

from backend.app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    print("Bridge Pedestrian Monitoring backend running at http://localhost:5000")
    print("Dashboard:  http://localhost:5000/")
    print("API root:   http://localhost:5000/api/")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
