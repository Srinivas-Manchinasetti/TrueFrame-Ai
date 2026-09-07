import React, { useState } from "react";
import { Loader2, AlertCircle, Clock, Film, BarChart2, CheckCircle2, XCircle } from "lucide-react";
import UploadDropzone from "../components/UploadDropzone.jsx";
import VerdictBadge from "../components/VerdictBadge.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function VideoCheck() {
  const { token } = useAuth();
  const [videoPreview, setVideoPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setVideoPreview(URL.createObjectURL(file));
    setFileInfo({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) });
    setStatus("loading");
    setResult(null);
    setErrorMessage("");
    setActiveFrameIndex(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/predict/video", {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Video analysis failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      console.error("Prediction failed:", err);
      setErrorMessage(err.message || "Failed to analyze video. Please verify the backend is running.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setVideoPreview(null);
    setFileInfo(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
    setActiveFrameIndex(null);
  };

  return (
    <div className="container" style={{ padding: "56px 24px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 32, margin: "0 0 8px", letterSpacing: -0.5 }}>
          Inspect a Video Clip
        </h2>
        <p style={{ fontSize: 15, color: "var(--slate)", marginBottom: 36, lineHeight: 1.5 }}>
          Upload MP4, MOV, or WEBM clips. TrueFrame extracts uniformly sampled frames across the timeline, measures per-frame latent anomalies, and detects generative facial flicker.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28, alignItems: "start" }}>
          <div>
            <UploadDropzone
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              hint="MP4, MOV, or WEBM up to 100MB"
              onFile={handleFile}
            />

            {fileInfo && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12.5,
                  color: "var(--slate)",
                  background: "rgba(0,0,0,0.02)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                  {fileInfo.name}
                </span>
                <span>{fileInfo.size} MB</span>
              </div>
            )}

            {videoPreview && (
              <div style={{ marginTop: 16 }}>
                <video
                  src={videoPreview}
                  controls
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    borderRadius: 6,
                    background: "black",
                    border: "1px solid var(--line)",
                  }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 24,
              background: "var(--panel)",
              minHeight: 280,
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--slate)",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  margin: 0,
                }}
              >
                Temporal Analysis
              </p>
              {result && (
                <button
                  onClick={handleReset}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--slate)",
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {status === "loading" && (
              <div
                style={{
                  padding: "48px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  textAlign: "center",
                }}
              >
                <Loader2 size={30} className="spin-icon" style={{ animation: "spin 1s linear infinite", color: "var(--ink)" }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Analyzing Video Stream</p>
                  <p style={{ fontSize: 12.5, color: "var(--slate)", margin: 0 }}>
                    Extracting keyframes & evaluating temporal face coherence…
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "12px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  alignItems: "flex-start",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {status === "idle" && <VerdictBadge verdict={null} />}

            {status === "done" && result && (
              <div>
                <VerdictBadge verdict={result.verdict} confidence={result.confidence} />

                {result.summary && (
                  <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4, margin: "14px 0 12px" }}>
                    {result.summary}
                  </p>
                )}

                {/* Video Metrics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    margin: "14px 0",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--slate)" }}>Sampled Frames: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{result.total_frames_analyzed}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate)" }}>Flagged Ratio: </span>
                    <strong style={{ fontFamily: "var(--font-mono)", color: result.verdict === "fake" ? "var(--fake)" : "inherit" }}>
                      {result.fake_frames_ratio}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate)" }}>Duration: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{result.video_duration_sec}s</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate)" }}>Latency: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{result.inference_time_ms}ms</strong>
                  </div>
                </div>

                {/* Per-Frame Confidence Bar Chart */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--slate)", margin: 0, textTransform: "uppercase" }}>
                      Per-Frame Fake Likelihood
                    </p>
                    <span style={{ fontSize: 11, color: "var(--slate)" }}>Hover bars to inspect</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      height: 52,
                      alignItems: "flex-end",
                      background: "rgba(0,0,0,0.03)",
                      padding: "6px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                    }}
                  >
                    {result.frameScores?.map((score, i) => {
                      const isHighFake = score >= 50;
                      const isHovered = activeFrameIndex === i;
                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setActiveFrameIndex(i)}
                          style={{
                            flex: 1,
                            height: `${Math.max(12, score)}%`,
                            background: isHighFake ? "var(--fake)" : "var(--real)",
                            opacity: isHovered ? 1 : 0.82,
                            transform: isHovered ? "scaleY(1.08)" : "none",
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: "all 0.1s ease",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Active frame inspect detail */}
                  {activeFrameIndex !== null && result.frameDetails && result.frameDetails[activeFrameIndex] && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11.5,
                        color: "var(--slate)",
                        fontFamily: "var(--font-mono)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Frame #{result.frameDetails[activeFrameIndex].frame_index} ({result.frameDetails[activeFrameIndex].timestamp})</span>
                      <span style={{ color: result.frameDetails[activeFrameIndex].verdict === "fake" ? "var(--fake)" : "var(--real)", fontWeight: 600 }}>
                        {result.frameDetails[activeFrameIndex].verdict.toUpperCase()} · {result.frameDetails[activeFrameIndex].fake_prob}% fake score
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
