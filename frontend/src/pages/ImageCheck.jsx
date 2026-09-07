import React, { useState } from "react";
import { Loader2, AlertCircle, Clock, CheckCircle2, ShieldCheck, Activity } from "lucide-react";
import UploadDropzone from "../components/UploadDropzone.jsx";
import VerdictBadge from "../components/VerdictBadge.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function ImageCheck() {
  const { token } = useAuth();
  const [preview, setPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setFileInfo({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) });
    setStatus("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/predict/image", {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Detection failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      console.error("Prediction failed:", err);
      setErrorMessage(err.message || "Failed to analyze image. Please ensure the backend server is running.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFileInfo(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="container" style={{ padding: "56px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 32, margin: "0 0 8px", letterSpacing: -0.5 }}>
          Inspect an Image
        </h2>
        <p style={{ fontSize: 15, color: "var(--slate)", marginBottom: 36, lineHeight: 1.5 }}>
          Upload any portrait or face photograph. TrueFrame's frozen CLIP ViT-B/32 backbone extracts semantic boundary embeddings and identifies generative artifacts.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28, alignItems: "start" }}>
          <div>
            <UploadDropzone
              accept="image/jpeg,image/png,image/webp,image/avif"
              hint="JPG, PNG, or WEBP up to 15MB"
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
                Analysis Verdict
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

            {preview ? (
              <div style={{ position: "relative", marginBottom: 16 }}>
                <img
                  src={preview}
                  alt="Uploaded preview"
                  style={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                  }}
                />
                {status === "loading" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(20, 24, 31, 0.45)",
                      borderRadius: 6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      gap: 8,
                    }}
                  >
                    <Loader2 size={24} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Extracting latent features…</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 120,
                  background: "rgba(0,0,0,0.03)",
                  border: "1px dashed var(--line)",
                  borderRadius: 6,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--slate)",
                  fontSize: 12.5,
                }}
              >
                No image loaded yet
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

                {/* Summary */}
                {result.summary && (
                  <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4, margin: "14px 0 12px" }}>
                    {result.summary}
                  </p>
                )}

                {/* Latency and technical details */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    fontSize: 11.5,
                    color: "var(--slate)",
                    fontFamily: "var(--font-mono)",
                    borderTop: "1px solid var(--line)",
                    paddingTop: 12,
                    marginTop: 12,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> {result.inference_time_ms}ms
                  </span>
                  <span>Real: {result.real_prob}%</span>
                  <span>Fake: {result.fake_prob}%</span>
                </div>

                {/* Signals breakdown */}
                {result.signals && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--slate)", margin: "0 0 6px", textTransform: "uppercase" }}>
                      Signal Diagnostics
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(result.signals).map(([k, val]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--slate)", textTransform: "capitalize" }}>
                            {k.replace(/_/g, " ")}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
