from fastapi import FastAPI, UploadFile, File
from PIL import Image
import io
import torch
import torch.nn as nn
import numpy as np
import pennylane as qml
from torchvision import models, transforms
from ultralytics import YOLO
import base64
import cv2
from fastapi.middleware.cors import CORSMiddleware

# =========================
# CONFIG
# =========================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

NUM_QUBITS  = 4
NUM_QLAYERS = 2
NUM_CLASSES = 5
IMG_SIZE    = 64

CLASS_NAMES = [
    'Combat',
    'DestroyedBuildings',
    'Fire',
    'Humanitarian_Aid_and_rehabilitation',
    'Military_vehicles_and_weapons'
]

CLASSIFIER_PATH = "models/best_hybrid_qcnn.pt"
YOLO_PATH       = "models/yolo11n-seg.pt"

# =========================
# TRANSFORM
# =========================
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# =========================
# QUANTUM SETUP (FIXED)
# =========================
dev = qml.device("default.qubit", wires=NUM_QUBITS)

def quantum_conv(weights, wires):
    qml.U3(*weights[0:3], wires=wires[0])
    qml.U3(*weights[3:6], wires=wires[1])
    qml.CNOT(wires=wires)
    qml.U3(*weights[6:9], wires=wires[0])
    qml.U3(*weights[9:12], wires=wires[1])
    qml.CNOT(wires=wires[::-1])
    qml.U3(*weights[12:15], wires=wires[0])

def quantum_pool(weights, wires):
    qml.CRZ(weights[0], wires=wires)
    qml.PauliX(wires=wires[0])
    qml.CRX(weights[1], wires=wires)
    qml.PauliX(wires=wires[0])

@qml.qnode(dev, interface="torch")
def qcnn_circuit(inputs, conv_weights, pool_weights):
    qml.AngleEmbedding(inputs, wires=range(NUM_QUBITS), rotation='Y')

    active_wires = list(range(NUM_QUBITS))

    for layer in range(NUM_QLAYERS):

        # convolution
        for i in range(len(active_wires)):
            w0 = active_wires[i]
            w1 = active_wires[(i + 1) % len(active_wires)]
            quantum_conv(conv_weights[layer][i], wires=[w0, w1])

        # pooling (reduces qubits)
        new_active = []
        for j in range(0, len(active_wires) - 1, 2):
            w0 = active_wires[j]
            w1 = active_wires[j + 1]
            quantum_pool(pool_weights[layer][j // 2], wires=[w0, w1])
            new_active.append(w1)

        active_wires = new_active

    return [qml.expval(qml.PauliZ(w)) for w in active_wires]


def run_qcnn_batch(q_input, conv_weights, pool_weights):
    outputs = []
    for i in range(q_input.shape[0]):
        out = qcnn_circuit(q_input[i], conv_weights, pool_weights)

        if isinstance(out, (list, tuple)):
            out = torch.stack(out)

        outputs.append(out)

    return torch.stack(outputs)

# =========================
# MODEL (MATCHES TRAINING)
# =========================
class HybridQCNN(nn.Module):
    def __init__(self):
        super().__init__()

        backbone = models.mobilenet_v2(weights=None)
        self.encoder = backbone.features
        self.pool = nn.AdaptiveAvgPool2d(1)

        BACKBONE_DIM = 1280

        self.reducer = nn.Sequential(
            nn.Linear(BACKBONE_DIM, 128),
            nn.GELU(),
            nn.Linear(128, NUM_QUBITS),
            nn.Tanh()
        )

        self.conv_weights = nn.Parameter(
            torch.randn(NUM_QLAYERS, NUM_QUBITS, 15) * 0.1
        )

        self.pool_weights = nn.Parameter(
            torch.randn(NUM_QLAYERS, NUM_QUBITS // 2, 2) * 0.1
        )

        self.bypass = nn.Sequential(
            nn.Linear(NUM_QUBITS, 32),
            nn.GELU()
        )

        # QCNN_OUT = 1 → 1 + 32 = 33
        self.classifier = nn.Sequential(
            nn.Linear(33, 64),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(64, NUM_CLASSES)
        )

    def forward(self, x):
        feat = self.pool(self.encoder(x)).flatten(1)
        reduced = self.reducer(feat)

        q_input = reduced * np.pi

        q_out = run_qcnn_batch(
            q_input,
            self.conv_weights,
            self.pool_weights
        ).float().to(DEVICE)

        bypass = self.bypass(reduced)

        combined = torch.cat([q_out, bypass], dim=1)

        return self.classifier(combined)

# =========================
# LOAD MODELS
# =========================
print("🚀 Loading models...")

classifier = HybridQCNN().to(DEVICE)
classifier.load_state_dict(torch.load(CLASSIFIER_PATH, map_location=DEVICE))
classifier.eval()

segmentor = YOLO(YOLO_PATH)

print("✅ Models loaded!")

# =========================
# FASTAPI
# =========================
app = FastAPI(title="Hybrid QCNN API")

# ✅ CORS CONFIG
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for hackathon)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "API is running 🚀"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print("\n🚀 started prediction...")

    # Read image
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    print("✅ image loaded")

    # Preprocess
    tensor = transform(image).unsqueeze(0).to(DEVICE)
    print("⚙️ image processed")

    # Classification
    with torch.no_grad():
        logits = classifier(tensor)
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

    pred_idx = int(np.argmax(probs))

    print("🧠 classified")
    print("📊 processing results...")

    # YOLO segmentation
    results = segmentor.predict(source=image, verbose=False)
    result = results[0]

    num_objects = len(result.boxes) if result.boxes else 0

    # 🔥 GET ANNOTATED IMAGE
    annotated = result.plot()

    # Convert to base64
    _, buffer = cv2.imencode(".jpg", annotated)
    encoded_image = base64.b64encode(buffer).decode("utf-8")

    print("🎯 YOLO done")
    print("🖼️ image encoded")
    print("✅ returning response\n")

    return {
        "predicted_class": CLASS_NAMES[pred_idx],
        "confidence": float(probs[pred_idx]),
        "all_probabilities": {
            CLASS_NAMES[i]: float(probs[i])
            for i in range(NUM_CLASSES)
        },
        "detected_objects": num_objects,
        "segmented_image": encoded_image   # 🔥 THIS IS NEW
    }
    print("\n🚀 started prediction...")

    # Read image
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    print("✅ image loaded")

    # Preprocess
    tensor = transform(image).unsqueeze(0).to(DEVICE)
    print("⚙️ image processed")

    # Classification
    with torch.no_grad():
        logits = classifier(tensor)
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

    pred_idx = int(np.argmax(probs))

    print("🧠 classified")
    print("📊 processing results...")

    # YOLO
    results = segmentor.predict(source=image, verbose=False)
    num_objects = len(results[0].boxes) if results[0].boxes else 0

    print("🎯 YOLO done")
    print("✅ returning response\n")

    return {
        "predicted_class": CLASS_NAMES[pred_idx],
        "confidence": float(probs[pred_idx]),
        "all_probabilities": {
            CLASS_NAMES[i]: float(probs[i])
            for i in range(NUM_CLASSES)
        },
        "detected_objects": num_objects
    }