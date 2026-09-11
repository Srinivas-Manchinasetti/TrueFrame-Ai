import React from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon, Video, Clock, ArrowRight } from "lucide-react";
import InfiniteSpiral from "../components/InfiniteSpiral";

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Image detection",
    body: "Frozen CLIP ViT-B/32 semantic vision backbone with calibrated dual-class classifier head.",
    to: "/image",
    action: "Check an image",
  },
  {
    icon: Video,
    title: "Video detection",
    body: "Temporal keyframe sampling with per-frame confidence timeline and flicker anomaly detection.",
    to: "/video",
    action: "Check a video",
  },
  {
    icon: Clock,
    title: "Upload history",
    body: "Persistent forensic audit trail backed by MongoDB with session resilience.",
    to: "/history",
    action: "View audit trail",
  },
];

const SPIRAL_ITEMS = [
  { id: "face-1", image: "/faces/real_01.jpg", alt: "Authentic subject 01", tag: "REAL", score: "99.2%" },
  { id: "face-2", image: "/faces/synthetic_01.jpg", alt: "StyleGAN generative sample", tag: "SYNTHETIC", score: "97.8%" },
  { id: "face-3", image: "/faces/real_02.jpg", alt: "Authentic subject 02", tag: "REAL", score: "98.5%" },
  { id: "face-4", image: "/faces/synthetic_02.jpg", alt: "Stable Diffusion holdout", tag: "SYNTHETIC", score: "96.4%" },
  { id: "face-5", image: "/faces/real_03.jpg", alt: "Authentic subject 03", tag: "REAL", score: "99.1%" },
  { id: "face-6", image: "/faces/synthetic_03.jpg", alt: "Cross-generator synthesis", tag: "SYNTHETIC", score: "98.2%" },
  { id: "face-7", image: "/faces/real_04.jpg", alt: "Authentic subject 04", tag: "REAL", score: "97.9%" },
  { id: "face-8", image: "/faces/synthetic_04.jpg", alt: "Generative latent artifact", tag: "SYNTHETIC", score: "95.7%" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ padding: "64px 24px 80px" }}>
      {/* Hero Section: Two-Column Layout */}
      <div className="hero-grid">
        {/* Left Column: Headline, Subtext, CTAs (~52% width) */}
        <div className="hero-left-col">
          <h1
            style={{
              fontFamily: "var(--font-head)",
              fontSize: "clamp(36px, 4.4vw, 52px)",
              lineHeight: 1.12,
              margin: "0 0 22px",
              letterSpacing: -0.9,
              color: "var(--ink)",
            }}
          >
            Tell real faces from generated ones — in a photo or a video clip.
          </h1>
          <p
            style={{
              fontSize: 16.5,
              color: "var(--slate)",
              lineHeight: 1.65,
              marginBottom: 36,
              maxWidth: 540,
            }}
          >
            Upload an image or video. TrueFrame samples visual latents and boundary frequencies across patterns learned from StyleGAN and diffusion generators, delivering calibrated probabilities and artifact explanations.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/image")}
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none",
                borderRadius: 6,
                padding: "14px 26px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 22px rgba(0, 0, 0, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4)";
              }}
            >
              Check an image <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/video")}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--ink)",
                border: "1px solid var(--line-strong)",
                borderRadius: 6,
                padding: "14px 26px",
                fontSize: 14.5,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.borderColor = "var(--line-strong)";
              }}
            >
              Check a video
            </button>
          </div>
        </div>

        {/* Right Column: Infinite Spiral Component (~48% width) */}
        <div className="hero-right-col" title="Interactive 3D Spiral — Hover to pause, drag to rotate">
          <InfiniteSpiral
            items={SPIRAL_ITEMS}
            speed={0.45}
            grayscale={1}
            pauseOnHover={true}
            direction="up"
            radius={180}
            cardWidth={130}
            cardHeight={150}
            verticalSpacing={68}
            cardsPerTurn={7}
            centerScale={1.16}
            edgeFade={0.35}
            edgeBlur={4}
          />
        </div>
      </div>

      {/* Feature Cards: Separated Floating Cards with Hover Pop */}
      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="feature-card"
            onClick={() => navigate(f.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") navigate(f.to); }}
          >
            <div className="feature-icon-wrap">
              <f.icon size={22} />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                margin: "0 0 10px",
                color: "var(--ink)",
                letterSpacing: -0.3,
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--slate)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {f.body}
            </p>
            <div className="feature-action">
              <span>{f.action}</span>
              <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
