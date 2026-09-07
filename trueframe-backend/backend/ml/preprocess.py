"""
Image preprocessing for inference.

The actual CLIP-specific preprocessing (resize, normalize, etc.) comes from
clip.load(), so this module just handles turning raw uploaded bytes into a
PIL Image ready for that preprocessing step.
"""
import io
from PIL import Image


def bytes_to_pil_image(image_bytes: bytes) -> Image.Image:
    """Convert raw uploaded bytes into a PIL RGB image."""
    img = Image.open(io.BytesIO(image_bytes))
    return img.convert("RGB")
