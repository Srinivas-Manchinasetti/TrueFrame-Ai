"""
TrueFrame AI — Complete Training Pipeline for Google Colab
==========================================================

Copy this entire file into a Colab notebook cell (or split into cells at the
marked section breaks). Requires a GPU runtime.

Pipeline:
  1. Data Preparation — mount Drive, extract datasets
  2. Feature Extraction — frozen CLIP ViT-B/32 → 512-dim cached embeddings
  3. Classifier Head Training — TrueFrameHead with AdamW + cosine annealing
  4. Evaluation — in-domain (140k test) + cross-domain (Stable Diffusion holdout)
  5. Export — classifier_head.pt + model_metadata.json → download
"""

# ============================================================================
# 0. INSTALL DEPENDENCIES
# ============================================================================
# !pip install -q torch torchvision transformers pillow scikit-learn matplotlib tqdm

import os
import json
import time
import shutil
import datetime
import zipfile
from pathlib import Path
from collections import Counter

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from tqdm.auto import tqdm
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, confusion_matrix, classification_report,
    ConfusionMatrixDisplay, RocCurveDisplay
)

# ============================================================================
# 1. DATA PREPARATION
# ============================================================================
print("=" * 60)
print("STEP 1: Data Preparation")
print("=" * 60)

# --- Mount Google Drive ---
from google.colab import drive
drive.mount('/content/drive')

# --- Configuration ---
# Path to your zip file on Google Drive
DRIVE_DATASET_ZIP = "/content/drive/MyDrive/TrueFrame/140k-real-and-fake-faces.zip"
DRIVE_SD_ZIP = "/content/drive/MyDrive/TrueFrame/stable-diffusion-faces.zip"  # adjust path

# Local extraction paths (Colab disk — much faster than Drive FUSE)
LOCAL_DATA_DIR = "/content/data"
LOCAL_SD_DIR = "/content/data_sd"

# Where to cache extracted CLIP embeddings
CACHE_DIR = "/content/drive/MyDrive/TrueFrame/cached_embeddings"

# --- Extract 140k dataset to local disk ---
os.makedirs(LOCAL_DATA_DIR, exist_ok=True)

if not os.path.exists(os.path.join(LOCAL_DATA_DIR, "train")):
    print(f"Extracting 140k dataset from {DRIVE_DATASET_ZIP}...")
    with zipfile.ZipFile(DRIVE_DATASET_ZIP, 'r') as zf:
        zf.extractall(LOCAL_DATA_DIR)
    print("Extraction complete.")
else:
    print("140k dataset already extracted.")

# --- Resolve the double-nested path ---
# The Kaggle dataset extracts to: real_vs_fake/real_vs_fake/real-vs-fake/{train,valid,test}/{real,fake}
def find_data_root(base_dir):
    """Walk down nested directories to find the actual train/valid/test root."""
    for root, dirs, files in os.walk(base_dir):
        if 'train' in dirs and ('valid' in dirs or 'test' in dirs):
            return root
    # Fallback: check common patterns
    candidates = [
        os.path.join(base_dir, "real_vs_fake", "real_vs_fake", "real-vs-fake"),
        os.path.join(base_dir, "real_vs_fake", "real_vs_fake"),
        os.path.join(base_dir, "real_vs_fake"),
        base_dir,
    ]
    for c in candidates:
        if os.path.isdir(os.path.join(c, "train")):
            return c
    raise FileNotFoundError(f"Could not find train/valid/test structure under {base_dir}")

DATA_ROOT = find_data_root(LOCAL_DATA_DIR)
print(f"Resolved data root: {DATA_ROOT}")

# --- Validate splits ---
SPLITS_140K = {}
for split_name in ["train", "valid", "test"]:
    split_dir = os.path.join(DATA_ROOT, split_name)
    assert os.path.isdir(split_dir), f"Missing split directory: {split_dir}"
    real_dir = os.path.join(split_dir, "real")
    fake_dir = os.path.join(split_dir, "fake")
    assert os.path.isdir(real_dir), f"Missing real directory: {real_dir}"
    assert os.path.isdir(fake_dir), f"Missing fake directory: {fake_dir}"
    real_count = len([f for f in os.listdir(real_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
    fake_count = len([f for f in os.listdir(fake_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
    SPLITS_140K[split_name] = {"real": real_count, "fake": fake_count, "total": real_count + fake_count}
    print(f"  {split_name}: {real_count} real + {fake_count} fake = {real_count + fake_count} total")

total_140k = sum(s["total"] for s in SPLITS_140K.values())
print(f"  TOTAL: {total_140k} images")

# --- Extract Stable Diffusion holdout (if available) ---
SD_DIR = None
if os.path.exists(DRIVE_SD_ZIP):
    os.makedirs(LOCAL_SD_DIR, exist_ok=True)
    if not any(f.endswith(('.jpg', '.png')) for f in os.listdir(LOCAL_SD_DIR) if os.path.isfile(os.path.join(LOCAL_SD_DIR, f))):
        print(f"\nExtracting SD holdout from {DRIVE_SD_ZIP}...")
        with zipfile.ZipFile(DRIVE_SD_ZIP, 'r') as zf:
            zf.extractall(LOCAL_SD_DIR)
    # Find the directory containing the actual images
    for root, dirs, files in os.walk(LOCAL_SD_DIR):
        img_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        if len(img_files) > 100:
            SD_DIR = root
            break
    if SD_DIR:
        sd_count = len([f for f in os.listdir(SD_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
        print(f"  SD holdout: {sd_count} images in {SD_DIR}")
    else:
        print("  WARNING: Could not find SD images after extraction.")
else:
    print(f"\nSD holdout zip not found at {DRIVE_SD_ZIP} — skipping cross-domain eval.")


# ============================================================================
# 2. FEATURE EXTRACTION — CLIP ViT-B/32
# ============================================================================
print("\n" + "=" * 60)
print("STEP 2: Feature Extraction (CLIP ViT-B/32)")
print("=" * 60)

from transformers import CLIPProcessor, CLIPModel

CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {device}")

print(f"Loading CLIP model: {CLIP_MODEL_NAME}...")
clip_processor = CLIPProcessor.from_pretrained(CLIP_MODEL_NAME)
clip_model = CLIPModel.from_pretrained(CLIP_MODEL_NAME).to(device)
clip_model.eval()
for param in clip_model.parameters():
    param.requires_grad = False
print("CLIP model loaded and frozen.")


def extract_features_from_dir(image_dir, label, processor, model, batch_size=64):
    """
    Extract L2-normalized CLIP vision embeddings for all images in a directory.

    Uses the same extraction path as the FastAPI backend (model_engine.py L118-121):
      vision_outputs -> pooled_output -> visual_projection -> L2 normalize

    Args:
        image_dir: Path to directory containing images
        label: Integer label (0=real, 1=fake)
        processor: CLIPProcessor instance
        model: CLIPModel instance
        batch_size: Number of images to process at once

    Returns:
        features: Tensor of shape (N, 512) — L2-normalized embeddings
        labels: Tensor of shape (N,) — all set to `label`
    """
    image_files = sorted([
        os.path.join(image_dir, f)
        for f in os.listdir(image_dir)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    ])

    all_features = []
    failed = 0

    for i in tqdm(range(0, len(image_files), batch_size), desc=f"  {os.path.basename(image_dir)} (label={label})"):
        batch_paths = image_files[i:i + batch_size]
        batch_images = []
        for p in batch_paths:
            try:
                img = Image.open(p).convert("RGB")
                batch_images.append(img)
            except Exception:
                failed += 1
                continue

        if not batch_images:
            continue

        inputs = processor(images=batch_images, return_tensors="pt", padding=True)
        pixel_values = inputs["pixel_values"].to(device)

        with torch.no_grad():
            # Replicate the exact backend extraction path
            vision_outputs = model.vision_model(pixel_values=pixel_values)
            pooled_output = vision_outputs[1]  # [CLS] token pooled output
            image_features = model.visual_projection(pooled_output)
            # L2 normalize — CRITICAL: must match backend model_engine.py L121
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        all_features.append(image_features.cpu())

    if failed > 0:
        print(f"    ({failed} images failed to load)")

    features = torch.cat(all_features, dim=0)
    labels = torch.full((features.shape[0],), label, dtype=torch.long)
    return features, labels


def extract_or_load_cached(split_name, data_root, cache_dir, processor, model):
    """Extract features for a split, or load from cache if available."""
    cache_path = os.path.join(cache_dir, f"{split_name}_features.pt")

    if os.path.exists(cache_path):
        print(f"  Loading cached features: {cache_path}")
        cached = torch.load(cache_path, map_location="cpu")
        return cached["features"], cached["labels"]

    split_dir = os.path.join(data_root, split_name)
    real_dir = os.path.join(split_dir, "real")
    fake_dir = os.path.join(split_dir, "fake")

    real_features, real_labels = extract_features_from_dir(real_dir, label=0, processor=processor, model=model)
    fake_features, fake_labels = extract_features_from_dir(fake_dir, label=1, processor=processor, model=model)

    features = torch.cat([real_features, fake_features], dim=0)
    labels = torch.cat([real_labels, fake_labels], dim=0)

    # Shuffle
    perm = torch.randperm(features.shape[0])
    features = features[perm]
    labels = labels[perm]

    # Cache to Drive for future runs
    os.makedirs(cache_dir, exist_ok=True)
    torch.save({"features": features, "labels": labels}, cache_path)
    print(f"  Cached features to {cache_path} ({features.shape[0]} samples, {features.shape[1]}-dim)")

    return features, labels


# --- Extract features for all splits ---
os.makedirs(CACHE_DIR, exist_ok=True)

print("\nExtracting/loading TRAIN features...")
train_features, train_labels = extract_or_load_cached("train", DATA_ROOT, CACHE_DIR, clip_processor, clip_model)

print("\nExtracting/loading VALID features...")
val_features, val_labels = extract_or_load_cached("valid", DATA_ROOT, CACHE_DIR, clip_processor, clip_model)

print("\nExtracting/loading TEST features...")
test_features, test_labels = extract_or_load_cached("test", DATA_ROOT, CACHE_DIR, clip_processor, clip_model)

# --- SD holdout features ---
sd_features, sd_labels = None, None
if SD_DIR:
    sd_cache_path = os.path.join(CACHE_DIR, "sd_holdout_features.pt")
    if os.path.exists(sd_cache_path):
        print("\nLoading cached SD holdout features...")
        cached = torch.load(sd_cache_path, map_location="cpu")
        sd_features, sd_labels = cached["features"], cached["labels"]
    else:
        print("\nExtracting SD holdout features (all fake, label=1)...")
        sd_features, sd_labels = extract_features_from_dir(SD_DIR, label=1, processor=clip_processor, model=clip_model)
        torch.save({"features": sd_features, "labels": sd_labels}, sd_cache_path)
        print(f"  Cached SD features: {sd_features.shape[0]} samples")

print(f"\n--- Feature Summary ---")
print(f"Train: {train_features.shape[0]} samples (real: {(train_labels==0).sum()}, fake: {(train_labels==1).sum()})")
print(f"Valid: {val_features.shape[0]} samples (real: {(val_labels==0).sum()}, fake: {(val_labels==1).sum()})")
print(f"Test:  {test_features.shape[0]} samples (real: {(test_labels==0).sum()}, fake: {(test_labels==1).sum()})")
if sd_features is not None:
    print(f"SD holdout: {sd_features.shape[0]} samples (all fake)")

# Free CLIP model from GPU memory — we only need the tiny head from here
del clip_model, clip_processor
torch.cuda.empty_cache()
print("\nCLIP model unloaded from GPU. Only classifier head training from here.")


# ============================================================================
# 3. CLASSIFIER HEAD TRAINING
# ============================================================================
print("\n" + "=" * 60)
print("STEP 3: Classifier Head Training")
print("=" * 60)


class TrueFrameHead(nn.Module):
    """
    Lightweight classification head mounted on top of frozen CLIP ViT-B/32 features.
    Input: 512-dim normalized vision embedding
    Output: 2-class logits [real, fake]

    IMPORTANT: This class definition MUST match model/export_model.py exactly.
    Label convention: class 0 = real, class 1 = fake
    """
    def __init__(self, input_dim=512, hidden_dim=256, dropout=0.15):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(dropout / 2),
            nn.Linear(64, 2)
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.0)

    def forward(self, x):
        return self.net(x)


# --- Hyperparameters ---
BATCH_SIZE = 256
NUM_EPOCHS = 25
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-2

# --- DataLoaders ---
train_dataset = TensorDataset(train_features, train_labels)
val_dataset = TensorDataset(val_features, val_labels)
test_dataset = TensorDataset(test_features, test_labels)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, drop_last=False)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

# --- Model, Loss, Optimizer, Scheduler ---
head = TrueFrameHead().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(head.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS, eta_min=1e-6)

param_count = sum(p.numel() for p in head.parameters() if p.requires_grad)
print(f"TrueFrameHead parameters: {param_count:,}")
print(f"Batch size: {BATCH_SIZE}, Epochs: {NUM_EPOCHS}, LR: {LEARNING_RATE}")

# --- Verify label convention ---
assert train_labels.min() == 0 and train_labels.max() == 1, \
    f"Labels must be 0 (real) and 1 (fake), got min={train_labels.min()}, max={train_labels.max()}"
print(f"Label convention verified: 0=real, 1=fake")


def evaluate(model, loader, device):
    """Run evaluation and return metrics dict."""
    model.eval()
    all_preds = []
    all_labels = []
    all_probs = []
    total_loss = 0.0
    n_batches = 0

    with torch.no_grad():
        for features, labels in loader:
            features, labels = features.to(device), labels.to(device)
            logits = model(features)
            loss = criterion(logits, labels)
            total_loss += loss.item()
            n_batches += 1

            probs = torch.softmax(logits, dim=-1)
            preds = logits.argmax(dim=-1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # P(fake)

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    return {
        "loss": total_loss / max(n_batches, 1),
        "accuracy": accuracy_score(all_labels, all_preds),
        "f1": f1_score(all_labels, all_preds, average="binary", pos_label=1),
        "precision": precision_score(all_labels, all_preds, average="binary", pos_label=1, zero_division=0),
        "recall": recall_score(all_labels, all_preds, average="binary", pos_label=1, zero_division=0),
        "roc_auc": roc_auc_score(all_labels, all_probs) if len(np.unique(all_labels)) > 1 else 0.0,
        "predictions": all_preds,
        "labels": all_labels,
        "probs": all_probs,
    }


# --- Training Loop ---
history = {"train_loss": [], "val_loss": [], "val_acc": [], "val_f1": [], "val_auc": [], "lr": []}
best_val_f1 = 0.0
best_val_loss = float("inf")
best_epoch = 0
best_state_dict = None

print(f"\n{'Epoch':>5} {'Train Loss':>11} {'Val Loss':>9} {'Val Acc':>8} {'Val F1':>7} {'Val AUC':>8} {'LR':>10}")
print("-" * 70)

for epoch in range(1, NUM_EPOCHS + 1):
    # --- Train ---
    head.train()
    epoch_loss = 0.0
    n_batches = 0

    for features, labels in train_loader:
        features, labels = features.to(device), labels.to(device)
        optimizer.zero_grad()
        logits = head(features)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        epoch_loss += loss.item()
        n_batches += 1

    avg_train_loss = epoch_loss / max(n_batches, 1)

    # --- Validate ---
    val_metrics = evaluate(head, val_loader, device)

    current_lr = optimizer.param_groups[0]["lr"]
    scheduler.step()

    # --- Log ---
    history["train_loss"].append(avg_train_loss)
    history["val_loss"].append(val_metrics["loss"])
    history["val_acc"].append(val_metrics["accuracy"])
    history["val_f1"].append(val_metrics["f1"])
    history["val_auc"].append(val_metrics["roc_auc"])
    history["lr"].append(current_lr)

    print(f"{epoch:5d} {avg_train_loss:11.4f} {val_metrics['loss']:9.4f} "
          f"{val_metrics['accuracy']:8.4f} {val_metrics['f1']:7.4f} {val_metrics['roc_auc']:8.4f} {current_lr:10.2e}")

    # --- Save best ---
    if val_metrics["f1"] > best_val_f1:
        best_val_f1 = val_metrics["f1"]
        best_val_loss = val_metrics["loss"]
        best_epoch = epoch
        best_state_dict = {k: v.clone() for k, v in head.state_dict().items()}

print(f"\nBest epoch: {best_epoch} (val_f1={best_val_f1:.4f}, val_loss={best_val_loss:.4f})")

# Load best weights
head.load_state_dict(best_state_dict)
head.eval()


# --- Training Curves Plot ---
fig, axes = plt.subplots(1, 3, figsize=(16, 4))
epochs_range = range(1, NUM_EPOCHS + 1)

axes[0].plot(epochs_range, history["train_loss"], label="Train Loss", color="#1B7A72")
axes[0].plot(epochs_range, history["val_loss"], label="Val Loss", color="#E05A47")
axes[0].axvline(best_epoch, color="gray", linestyle="--", alpha=0.5, label=f"Best (epoch {best_epoch})")
axes[0].set_xlabel("Epoch"); axes[0].set_ylabel("Loss"); axes[0].legend(); axes[0].set_title("Loss")

axes[1].plot(epochs_range, history["val_acc"], label="Val Accuracy", color="#1B7A72")
axes[1].plot(epochs_range, history["val_f1"], label="Val F1", color="#E05A47")
axes[1].axvline(best_epoch, color="gray", linestyle="--", alpha=0.5)
axes[1].set_xlabel("Epoch"); axes[1].set_ylabel("Score"); axes[1].legend(); axes[1].set_title("Accuracy & F1")

axes[2].plot(epochs_range, history["val_auc"], label="Val ROC-AUC", color="#6366F1")
axes[2].axvline(best_epoch, color="gray", linestyle="--", alpha=0.5)
axes[2].set_xlabel("Epoch"); axes[2].set_ylabel("AUC"); axes[2].legend(); axes[2].set_title("ROC-AUC")

plt.tight_layout()
plt.savefig("training_curves.png", dpi=150, bbox_inches="tight")
plt.show()
print("Saved: training_curves.png")


# ============================================================================
# 4. EVALUATION
# ============================================================================
print("\n" + "=" * 60)
print("STEP 4: Evaluation")
print("=" * 60)


def full_evaluation(model, loader, dataset_name, device):
    """Run full evaluation with classification report, confusion matrix, and ROC curve."""
    metrics = evaluate(model, loader, device)

    print(f"\n--- {dataset_name} ---")
    print(f"Accuracy:  {metrics['accuracy']:.4f}")
    print(f"F1 Score:  {metrics['f1']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall:    {metrics['recall']:.4f}")
    print(f"ROC-AUC:   {metrics['roc_auc']:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(metrics["labels"], metrics["predictions"],
                                target_names=["Real (0)", "Fake (1)"]))

    # Confusion matrix
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    cm = confusion_matrix(metrics["labels"], metrics["predictions"])
    disp = ConfusionMatrixDisplay(cm, display_labels=["Real", "Fake"])
    disp.plot(ax=axes[0], cmap="Blues", values_format="d")
    axes[0].set_title(f"{dataset_name} — Confusion Matrix")

    # ROC curve
    if len(np.unique(metrics["labels"])) > 1:
        RocCurveDisplay.from_predictions(
            metrics["labels"], metrics["probs"],
            name=dataset_name, ax=axes[1], color="#1B7A72"
        )
        axes[1].set_title(f"{dataset_name} — ROC Curve")
        axes[1].plot([0, 1], [0, 1], "k--", alpha=0.3)

    plt.tight_layout()
    fname = f"eval_{dataset_name.lower().replace(' ', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight")
    plt.show()
    print(f"Saved: {fname}")

    return metrics


# --- In-domain evaluation (140k test split) ---
test_metrics = full_evaluation(head, test_loader, "140k Test (In-Domain)", device)

# --- Cross-domain evaluation (Stable Diffusion holdout) ---
sd_metrics = None
if sd_features is not None:
    # For the SD holdout, all images are fake (label=1).
    # To create a balanced evaluation, we sample an equal number of real images from the test set.
    sd_fake_count = sd_features.shape[0]
    test_real_mask = (test_labels == 0)
    test_real_features = test_features[test_real_mask]

    # Sample real images (up to the same count as SD fakes)
    n_real = min(sd_fake_count, test_real_features.shape[0])
    real_sample_idx = torch.randperm(test_real_features.shape[0])[:n_real]
    real_sample_features = test_real_features[real_sample_idx]
    real_sample_labels = torch.zeros(n_real, dtype=torch.long)

    # Combine: real test samples + SD fake samples
    sd_eval_features = torch.cat([real_sample_features, sd_features[:n_real]], dim=0)
    sd_eval_labels = torch.cat([real_sample_labels, sd_labels[:n_real]], dim=0)

    # Shuffle
    perm = torch.randperm(sd_eval_features.shape[0])
    sd_eval_features = sd_eval_features[perm]
    sd_eval_labels = sd_eval_labels[perm]

    sd_eval_dataset = TensorDataset(sd_eval_features, sd_eval_labels)
    sd_eval_loader = DataLoader(sd_eval_dataset, batch_size=BATCH_SIZE, shuffle=False)

    sd_metrics = full_evaluation(head, sd_eval_loader, "Stable Diffusion (Cross-Domain)", device)

    # --- Generalization Gap ---
    print("\n" + "=" * 60)
    print("GENERALIZATION GAP ANALYSIS")
    print("=" * 60)
    print(f"{'Metric':<12} {'In-Domain':>10} {'Cross-Domain':>13} {'Gap':>8}")
    print("-" * 45)
    for metric_name in ["accuracy", "f1", "precision", "recall", "roc_auc"]:
        in_val = test_metrics[metric_name]
        cross_val = sd_metrics[metric_name]
        gap = in_val - cross_val
        print(f"{metric_name:<12} {in_val:>10.4f} {cross_val:>13.4f} {gap:>+8.4f}")


# ============================================================================
# 5. EXPORT
# ============================================================================
print("\n" + "=" * 60)
print("STEP 5: Export")
print("=" * 60)

# --- Save trained weights (state_dict only) ---
head.eval()
EXPORT_PATH = "classifier_head.pt"
torch.save(head.state_dict(), EXPORT_PATH)
file_size = os.path.getsize(EXPORT_PATH)
print(f"Saved classifier head weights: {EXPORT_PATH} ({file_size:,} bytes)")

# --- Verify saved weights load correctly ---
verify_head = TrueFrameHead()
verify_head.load_state_dict(torch.load(EXPORT_PATH, map_location="cpu"))
verify_head.eval()

# Quick sanity check: run a batch through both and compare
with torch.no_grad():
    sample = test_features[:16].to("cpu")
    orig_out = head.cpu()(sample)
    verify_out = verify_head(sample)
    max_diff = (orig_out - verify_out).abs().max().item()
    assert max_diff < 1e-5, f"Verification failed! Max diff: {max_diff}"
    print(f"Weight verification passed (max diff: {max_diff:.2e})")

head.to(device)  # Move back to GPU if needed

# --- Save model metadata ---
METADATA_PATH = "model_metadata.json"
metadata = {
    "model_name": "TrueFrame-CLIP-ViT-B32-Head",
    "version": "1.0.0",
    "backbone": "openai/clip-vit-base-patch32",
    "backbone_frozen": True,
    "architecture": {
        "type": "TrueFrameHead",
        "input_dim": 512,
        "hidden_dim": 256,
        "output_classes": 2,
        "class_labels": ["real", "fake"],
        "dropout": 0.15,
        "parameter_count": param_count
    },
    "training": {
        "dataset": "140k Real and Fake Faces (Kaggle)",
        "dataset_source": "https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces",
        "total_train_samples": int(train_features.shape[0]),
        "total_val_samples": int(val_features.shape[0]),
        "epochs": NUM_EPOCHS,
        "best_epoch": best_epoch,
        "batch_size": BATCH_SIZE,
        "optimizer": "AdamW",
        "learning_rate": LEARNING_RATE,
        "weight_decay": WEIGHT_DECAY,
        "scheduler": "CosineAnnealingLR",
        "loss_function": "CrossEntropyLoss",
        "label_convention": "0=real, 1=fake"
    },
    "metrics": {
        "in_domain_test": {
            "dataset": "140k test split",
            "samples": int(test_features.shape[0]),
            "accuracy": round(test_metrics["accuracy"], 4),
            "f1_score": round(test_metrics["f1"], 4),
            "precision": round(test_metrics["precision"], 4),
            "recall": round(test_metrics["recall"], 4),
            "roc_auc": round(test_metrics["roc_auc"], 4),
        },
        "cross_domain_test": {
            "dataset": "Stable Diffusion holdout (~9k faces)",
            "samples": int(sd_features.shape[0]) if sd_features is not None else 0,
            "accuracy": round(sd_metrics["accuracy"], 4) if sd_metrics else None,
            "f1_score": round(sd_metrics["f1"], 4) if sd_metrics else None,
            "precision": round(sd_metrics["precision"], 4) if sd_metrics else None,
            "recall": round(sd_metrics["recall"], 4) if sd_metrics else None,
            "roc_auc": round(sd_metrics["roc_auc"], 4) if sd_metrics else None,
        } if sd_metrics else "Not evaluated"
    },
    "trained_at": datetime.datetime.utcnow().isoformat() + "Z",
    "exported_by": "TrueFrame Colab Training Pipeline v1.0",
    "file_format": "PyTorch state_dict",
    "notes": "Head trained on CLIP ViT-B/32 L2-normalized 512-dim embeddings. "
             "Load with: head = TrueFrameHead(); head.load_state_dict(torch.load(path))"
}

with open(METADATA_PATH, "w") as f:
    json.dump(metadata, f, indent=2)
print(f"Saved model metadata: {METADATA_PATH}")
print(json.dumps(metadata["metrics"], indent=2))

# --- Copy to Google Drive ---
DRIVE_EXPORT_DIR = "/content/drive/MyDrive/TrueFrame/exported_model"
os.makedirs(DRIVE_EXPORT_DIR, exist_ok=True)
shutil.copy2(EXPORT_PATH, os.path.join(DRIVE_EXPORT_DIR, "classifier_head.pt"))
shutil.copy2(METADATA_PATH, os.path.join(DRIVE_EXPORT_DIR, "model_metadata.json"))
shutil.copy2("training_curves.png", os.path.join(DRIVE_EXPORT_DIR, "training_curves.png"))
if os.path.exists("eval_140k_test_(in-domain).png"):
    shutil.copy2("eval_140k_test_(in-domain).png", os.path.join(DRIVE_EXPORT_DIR, "eval_in_domain.png"))
if os.path.exists("eval_stable_diffusion_(cross-domain).png"):
    shutil.copy2("eval_stable_diffusion_(cross-domain).png", os.path.join(DRIVE_EXPORT_DIR, "eval_cross_domain.png"))
print(f"\nAll artifacts copied to Google Drive: {DRIVE_EXPORT_DIR}")

# --- Download locally ---
try:
    from google.colab import files
    print("\nDownloading files to your local machine...")
    files.download(EXPORT_PATH)
    files.download(METADATA_PATH)
    files.download("training_curves.png")
    print("Download triggered — check your browser downloads.")
except Exception as e:
    print(f"(Direct download skipped: {e})")
    print(f"Files are available on Drive at: {DRIVE_EXPORT_DIR}")

print("\n" + "=" * 60)
print("PIPELINE COMPLETE")
print("=" * 60)
print(f"""
Next steps:
  1. Download classifier_head.pt and model_metadata.json from:
     {DRIVE_EXPORT_DIR}

  2. Drop them into your local project:
     trueframe-project/model/classifier_head.pt
     trueframe-project/model/model_metadata.json

  3. Start the FastAPI backend:
     uvicorn backend.main:app --reload

  4. Test with a known real face and a known AI-generated face.
""")
