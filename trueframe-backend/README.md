# TrueFrame AI — Backend

FastAPI backend serving the trained CLIP + classifier head model for
real-vs-AI-generated face detection.

## Setup

1. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate   # on Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Add your trained model:**
   Download `v2_classifier_head.pt` from your Google Drive
   (`TrueFrame/v2_classifier_head.pt`) and place it at:
   ```
   backend/models/v2_classifier_head.pt
   ```

4. **Run the server:**
   ```bash
   uvicorn backend.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

5. **Test it:**
   - Visit `http://localhost:8000/docs` for the interactive Swagger UI
   - Or test directly with curl:
     ```bash
     curl -X POST "http://localhost:8000/api/predict/image" \
       -F "file=@/path/to/some_face.jpg"
     ```
   - Expected response:
     ```json
     {
       "verdict": "fake",
       "confidence": 0.97,
       "p_real": 0.03,
       "p_fake": 0.97,
       "filename": "some_face.jpg"
     }
     ```

## Project structure

```
backend/
├── main.py              # FastAPI app entrypoint, CORS setup
├── config.py             # paths and settings
├── requirements.txt
├── models/
│   └── v2_classifier_head.pt   # <- you add this manually
├── ml/
│   ├── model_def.py       # TrueFrameHead architecture (must match training)
│   ├── inference.py       # loads CLIP + head, runs predictions
│   └── preprocess.py       # raw bytes -> PIL image
└── routers/
    └── predict.py         # POST /api/predict/image
```

## What's not in this version yet

- Google OAuth login
- MongoDB history logging
- Video detection endpoint

These come next, once the image pipeline is confirmed working end-to-end.
