"""T1 verification: run the selected PPE model on a real image."""
import time
from ultralytics import YOLO

model = YOLO("models/ppe-yolov8n.pt")
print("classes:", model.names)

t0 = time.time()
results = model.predict("/tmp/test-worker.jpg", conf=0.35, verbose=False)
dt = time.time() - t0
print(f"inference: {dt:.2f}s")

for box in results[0].boxes:
    cls = model.names[int(box.cls[0])]
    conf = float(box.conf[0])
    print(f"  {cls:12s} conf={conf:.2f}")
print("T1-INFERENCE-OK")
