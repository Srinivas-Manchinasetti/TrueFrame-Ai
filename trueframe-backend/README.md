# TrueFrame AI — Backend Service

High-throughput, asynchronous FastAPI backend serving the deep learning inference engine for real vs. AI-generated face and video detection.

---

## ⚡ Architecture & Components

- **Inference Backbone**: OpenAI CLIP ViT-B/32 (frozen parameters for robust zero-shot generalized latent representations).
- **Classifier Head**: Custom 2-stage MLP (`TrueFrameHead`) with LayerNorm, GELU, and Dropout layers mapping 512-dim normalized feature embeddings to binary real/fake classification.
- **Video Inspection Pipeline**: OpenCV-driven keyframe extraction with uniform temporal stride, batch inference, and temporal anomaly aggregation.
- **Authentication**: Clerk JWT validation via public JWKS key verification (asymmetric RSA/EdDSA).
- **Database & Persistence**: MongoDB Atlas cluster support via `pymongo` with automatic graceful fallback to an in-memory thread-safe cache if offline or unconfigured.

---

## 🚀 Setup & Execution

### 1. Create a Virtual Environment
```bash
python -m venv venv
```
Activate on Windows:
```powershell
.\venv\Scripts\Activate.ps1
```
Activate on Linux/macOS:
```bash
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Model Weights
Place the trained classifier weights `v2_classifier_head.pt` in the models directory:
```
backend/models/v2_classifier_head.pt
```

### 4. Environment Configuration
Copy `.env.example` to `backend/.env`:
```ini
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=TrueFrameAI
MONGODB_DB_NAME=trueframe
TRUEFRAME_DEVICE=cpu
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### 5. Launch Server
```bash
uvicorn backend.main:app --reload --port 8000
```
- Interactive API Docs (Swagger): `http://localhost:8000/docs`
- Redoc API Docs: `http://localhost:8000/redoc`

---

## 📡 Key Endpoints

- `GET /health`: Returns engine hardware (`cpu`/`cuda`) and MongoDB connection health.
- `POST /api/predict/image`: Multipart image upload evaluating generative synthesis artifacts.
- `POST /api/predict/video`: Multipart video upload running keyframe sampling & temporal artifact evaluation.
- `GET /api/history`: Returns audit history of inspections.
- `DELETE /api/history`: Purges stored inspection logs.
- `GET /api/auth/me`: Decodes and validates Clerk Bearer tokens.
