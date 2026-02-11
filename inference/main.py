"""GPU inference backend — synthetic detection mode for WWT Edge Demo."""
import random
import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WWT GPU Inference", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

CLASSES = ["vehicle", "person", "fuel_truck"]
CLASS_WEIGHTS = [0.60, 0.30, 0.10]
CANVAS_W, CANVAS_H = 640, 400


@app.get("/api/health")
def health():
    return {"status": "ok", "gpu_scheduled": True, "mode": "synthetic"}


@app.get("/api/detect")
def detect():
    start = time.monotonic()
    # Simulate inference latency
    time.sleep(random.uniform(0.010, 0.025))
    elapsed_ms = round((time.monotonic() - start) * 1000, 1)

    n = random.randint(2, 6)
    detections = []
    for _ in range(n):
        cls = random.choices(CLASSES, weights=CLASS_WEIGHTS, k=1)[0]
        w = random.randint(60, 180)
        h = random.randint(50, 150)
        x = random.randint(0, CANVAS_W - w)
        y = random.randint(0, CANVAS_H - h)
        conf = round(random.uniform(0.70, 0.99), 2)
        detections.append(
            {"class": cls, "confidence": conf, "bbox": [x, y, w, h]}
        )

    return {
        "detections": detections,
        "inference_ms": elapsed_ms,
        "camera": "pump-area",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
