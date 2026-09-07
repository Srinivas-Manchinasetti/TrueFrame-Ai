"""
TrueFrameHead — the trainable classifier head architecture.

This MUST exactly match the architecture used during training in Colab
(see the Step 3 training notebook), since we're loading a saved state_dict
here, not the full model object.
"""
import torch.nn as nn


class TrueFrameHead(nn.Module):
    def __init__(self, input_dim: int = 512, hidden_dim: int = 256, dropout: float = 0.15):
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
            nn.Linear(64, 2),
        )

    def forward(self, x):
        return self.net(x)
