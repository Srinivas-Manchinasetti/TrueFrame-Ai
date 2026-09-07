import React, { useEffect, useState } from "react";
import { ImageIcon, Video, Trash2, RefreshCw, Filter, ShieldCheck, AlertCircle } from "lucide-react";
import VerdictBadge from "../components/VerdictBadge.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function History() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all | image | video
  const [filterVerdict, setFilterVerdict] = useState("all"); // all | real | fake

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/history", { headers });
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/history/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your inspection history?")) return;
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/history", { method: "DELETE", headers });
      if (res.ok) {
        setRows([]);
      }
    } catch (err) {
      console.error("Clear failed:", err);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterVerdict !== "all" && r.verdict !== filterVerdict) return false;
    return true;
  });

  return (
    <div className="container" style={{ padding: "56px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 32, margin: "0 0 6px", letterSpacing: -0.5 }}>
              Inspection Log
            </h2>
            <p style={{ fontSize: 14, color: "var(--slate)", margin: 0 }}>
              {user ? `Logged checks for ${user.email}` : "Recent local and session inspections"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={fetchHistory}
              title="Refresh"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--panel)",
                border: "1px solid var(--line)",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            {rows.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  color: "#B91C1C",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        {rows.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              padding: "10px 16px",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--slate)", display: "flex", alignItems: "center", gap: 4 }}>
                <Filter size={14} /> Type:
              </span>
              {["all", "image", "video"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    background: filterType === t ? "var(--ink)" : "transparent",
                    color: filterType === t ? "white" : "var(--slate)",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 12,
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--slate)" }}>Verdict:</span>
              {["all", "real", "fake"].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterVerdict(v)}
                  style={{
                    background: filterVerdict === v ? "var(--ink)" : "transparent",
                    color: filterVerdict === v ? "white" : "var(--slate)",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 12,
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {v === "real" ? "Authentic" : v === "fake" ? "AI-Generated" : "All"}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--slate)", fontSize: 14 }}>
            Loading history records…
          </div>
        ) : filteredRows.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--line)",
              borderRadius: 8,
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--panel)",
            }}
          >
            <ShieldCheck size={32} color="var(--slate)" style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px" }}>No inspection records found</p>
            <p style={{ fontSize: 13, color: "var(--slate)", margin: 0 }}>
              Upload a photograph or video in Image Check or Video Check to view real-time forensic history.
            </p>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "var(--panel)" }}>
            {filteredRows.map((r, i) => (
              <div
                key={r.id || i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 170px 40px",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderBottom: i < filteredRows.length - 1 ? "1px solid var(--line)" : "none",
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      padding: 8,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {r.type === "image" ? <ImageIcon size={16} color="var(--ink)" /> : <Video size={16} color="var(--ink)" />}
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, display: "block" }}>{r.name}</span>
                    {r.summary && (
                      <span style={{ fontSize: 12, color: "var(--slate)", display: "block", marginTop: 2, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.summary}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: 12.5, color: "var(--slate)", fontFamily: "var(--font-mono)" }}>
                  {r.date}
                </span>

                <VerdictBadge verdict={r.verdict} confidence={r.confidence} />

                <button
                  onClick={(e) => handleDelete(r.id, e)}
                  title="Delete record"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--slate)",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
