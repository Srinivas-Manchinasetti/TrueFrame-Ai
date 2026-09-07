import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file in trueframe-backend or backend directory
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"), override=True)
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

# Path to the trained classifier head weights.
# Copy your v2_classifier_head.pt from Google Drive into backend/models/
MODEL_WEIGHTS_PATH = os.path.join(BASE_DIR, "models", "v2_classifier_head.pt")

# CLIP backbone variant — must match what was used during training
CLIP_MODEL_NAME = "ViT-B/32"

# "cuda" if you have a local GPU, otherwise "cpu" (fine for inference —
# only the small head + CLIP forward pass are needed, no training)
DEVICE = os.environ.get("TRUEFRAME_DEVICE", "cpu")

# MongoDB Atlas connection settings
MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "trueframe")

# Clerk authentication
# Get these from: https://dashboard.clerk.com → API Keys
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")  # optional; auto-derived if blank
