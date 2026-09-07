import React from "react";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 40 }}>
      <div className="container" style={{ padding: "28px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--slate)" }}>TrueFrame AI — face &amp; video authenticity checker</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>built by Srinivas</span>
      </div>
    </footer>
  );
}
