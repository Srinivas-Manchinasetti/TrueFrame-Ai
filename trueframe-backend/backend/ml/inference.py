"""
Inference engine for TrueFrame AI.

Loads frozen CLIP ViT-B/32 + the trained classifier head once at startup,
then exposes a simple predict() function used by the API routes.
"""
import torch
import torch.nn.functional as F
import clip

from backend.config import MODEL_WEIGHTS_PATH, CLIP_MODEL_NAME, DEVICE
from backend.ml.model_def import TrueFrameHead


class TrueFrameEngine:
    def __init__(self):
        self.device = DEVICE
        print(f"[TrueFrameEngine] Loading CLIP ({CLIP_MODEL_NAME}) on {self.device}...")
        self.clip_model, self.clip_preprocess = clip.load(CLIP_MODEL_NAME, device=self.device)
        self.clip_model.eval()
        for p in self.clip_model.parameters():
            p.requires_grad = False

        print(f"[TrueFrameEngine] Loading classifier head from {MODEL_WEIGHTS_PATH}...")
        self.head = TrueFrameHead().to(self.device)
        state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=self.device, weights_only=True)
        self.head.load_state_dict(state_dict)
        self.head.eval()
        print("[TrueFrameEngine] Ready.")

    @torch.no_grad()
    def predict_image(self, pil_image) -> dict:
        """
        Run a single PIL image through CLIP + the classifier head.

        Returns a dict with the verdict, confidence, and raw class probabilities.
        """
        image_tensor = self.clip_preprocess(pil_image).unsqueeze(0).to(self.device)

        features = self.clip_model.encode_image(image_tensor)
        features = features / features.norm(dim=-1, keepdim=True)  # L2 normalize

        logits = self.head(features.float())
        probs = F.softmax(logits, dim=1)[0]  # [P(real), P(fake)]

        p_real = probs[0].item()
        p_fake = probs[1].item()
        verdict = "fake" if p_fake > p_real else "real"
        confidence = max(p_real, p_fake)

        return {
            "verdict": verdict,
            "confidence": round(confidence, 4),
            "p_real": round(p_real, 4),
            "p_fake": round(p_fake, 4),
        }


# Single shared instance, loaded once when the app starts
engine = TrueFrameEngine()
