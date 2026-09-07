import os
import torch
import torch.nn as nn

class TrueFrameHead(nn.Module):
    """
    Lightweight classification head mounted on top of frozen CLIP ViT-B/32 features.
    Input: 512-dim normalized vision embedding
    Output: 2-class logits [real, fake]
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

def export_head_weights(save_path="model/classifier_head.pt"):
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    head = TrueFrameHead()
    head.eval()
    
    # Save state dict
    torch.save(head.state_dict(), save_path)
    print(f"Exported model head to {save_path}")

if __name__ == "__main__":
    export_head_weights()
