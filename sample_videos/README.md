Put a video here to run the pipeline on, or generate the synthetic one:

    python data/generate_synthetic_bridge_data.py

That writes `synthetic_bridge.mp4` (for visual reference) and
`synthetic_bridge_ground_truth.json` (for `--mock-detections`, which replays exact
ground-truth boxes through the tracker+counter+API without needing a real detector).

For a real test, record ~30-60 seconds of any elevated walkway, staircase, or narrow
corridor on your phone, from roughly overhead if possible, and drop the file here.
The pipeline works on any video source: `--source sample_videos/your_clip.mp4`.
