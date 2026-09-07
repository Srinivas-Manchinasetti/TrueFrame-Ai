import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// verdict: "real" | "fake" | null (null = no result yet)
export default function VerdictBadge({ verdict, confidence }) {
  if (!verdict) {
    return <span style={{ fontSize: 13, color: "var(--slate)" }}>No result yet</span>;
  }

  const isReal = verdict === "real";
  const color = isReal ? "var(--real)" : "var(--fake)";
  const Icon = isReal ? CheckCircle2 : XCircle;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${color}`, borderRadius: 4, padding: "6px 12px", width: "fit-content" }}>
      <Icon size={16} color={color} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, letterSpacing: 0.2 }}>
        {isReal ? "AUTHENTIC" : "AI-GENERATED"} · {confidence}%
      </span>
    </div>
  );
}
