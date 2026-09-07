import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon, Video, Clock, CheckCircle2, Cpu, Activity, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: ImageIcon, title: "Image detection", body: "Frozen CLIP ViT-B/32 semantic vision backbone with calibrated dual-class classifier head." },
  { icon: Video, title: "Video detection", body: "Temporal keyframe sampling with per-frame confidence timeline and flicker anomaly detection." },
  { icon: Clock, title: "Upload history", body: "Persistent forensic audit trail backed by MongoDB with session resilience." },
];

export default function Home() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && data.status === "ok") {
          setHealth(data);
        } else {
          setHealth(null);
        }
      })
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="container" style={{ padding: "72px 24px" }}>
      <div style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--slate)",
              textTransform: "uppercase",
              letterSpacing: 1,
              background: "rgba(0,0,0,0.04)",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid var(--line)",
            }}
          >
            CLIP ViT-B/32 · Cross-Generator Generalization
          </span>
          {health?.device && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--real)",
                background: "rgba(27, 122, 114, 0.08)",
                padding: "3px 8px",
                borderRadius: 12,
                border: "1px solid rgba(27, 122, 114, 0.25)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--real)", display: "inline-block" }} />
              Engine Online ({String(health.device).toUpperCase()})
            </span>
          )}
          {health?.mongodb && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: health.mongodb === "connected" ? "var(--real)" : "var(--slate)",
                background: health.mongodb === "connected" ? "rgba(27, 122, 114, 0.08)" : "rgba(0,0,0,0.04)",
                padding: "3px 8px",
                borderRadius: 12,
                border: health.mongodb === "connected" ? "1px solid rgba(27, 122, 114, 0.25)" : "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: health.mongodb === "connected" ? "var(--real)" : "#D97706",
                  display: "inline-block",
                }}
              />
              MongoDB: {health.mongodb === "connected" ? "Atlas Online" : "Local Store"}
            </span>
          )}
        </div>

        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 48, lineHeight: 1.12, margin: "0 0 20px", letterSpacing: -0.8 }}>
          Tell real faces from generated ones — in a photo or a video clip.
        </h1>
        <p style={{ fontSize: 16, color: "var(--slate)", lineHeight: 1.6, marginBottom: 32 }}>
          Upload an image or video. TrueFrame samples visual latents and boundary frequencies across patterns learned from StyleGAN and diffusion generators, delivering calibrated probabilities and artifact explanations.
        </p>
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={() => navigate("/image")}
            style={{
              background: "var(--ink)",
              color: "var(--panel)",
              border: "none",
              borderRadius: 6,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Check an image <ArrowRight size={15} />
          </button>
          <button
            onClick={() => navigate("/video")}
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--ink)",
              borderRadius: 6,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Check a video
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--line)", marginTop: 72, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ background: "var(--panel)", padding: 28 }}>
            <f.icon size={20} color="var(--ink)" style={{ marginBottom: 14 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{f.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--slate)", lineHeight: 1.55, margin: 0 }}>{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
