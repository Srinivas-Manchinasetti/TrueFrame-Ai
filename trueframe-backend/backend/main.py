from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import predict, auth, history
from backend.ml.inference import engine

app = FastAPI(title="TrueFrame AI", version="0.1.0")

# Allow the React frontend (running on a different port during development)
# to call this API. Tighten this list once you know your frontend's exact
# origin, and definitely before deploying anywhere public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(auth.router)
app.include_router(history.router)


from backend.db import is_mongodb_connected

@app.get("/")
def root():
    return {"status": "TrueFrame AI backend is running"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "device": str(getattr(engine, "device", "cpu")),
        "mongodb": "connected" if is_mongodb_connected() else "disconnected",
    }

