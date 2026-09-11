import React from "react";
import { NavLink } from "react-router-dom";
import { ScanLine, User } from "lucide-react";
import { UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useAuth } from "../AuthContext.jsx";

const TABS = [
  { to: "/", label: "Home", end: true },
  { to: "/image", label: "Image Check" },
  { to: "/video", label: "Video Check" },
  { to: "/history", label: "History" },
];

export default function Navbar() {

  return (
    <header style={{ borderBottom: "1px solid var(--line)", background: "rgba(11, 14, 20, 0.85)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
            <div style={{ background: "var(--ink)", color: "var(--bg)", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScanLine size={18} />
            </div>
            <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 20, letterSpacing: -0.5 }}>TrueFrame AI</span>
          </NavLink>
          
          <nav style={{ display: "flex", gap: 6 }}>
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                style={({ isActive }) => ({
                  padding: "8px 14px",
                  fontSize: 14,
                  textDecoration: "none",
                  borderRadius: 4,
                  color: isActive ? "var(--ink)" : "var(--slate)",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  borderBottom: isActive ? "2px solid var(--ink)" : "2px solid transparent",
                  transition: "all 0.15s ease",
                })}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Clerk: show UserButton (avatar + account menu) when signed in */}
          <SignedIn>
            <UserButton
              afterSignOutUrl="/login"
              appearance={{
                variables: {
                  colorPrimary: "#14181f",
                  borderRadius: "8px",
                },
                elements: {
                  avatarBox: {
                    width: 32,
                    height: 32,
                  },
                },
              }}
            />
          </SignedIn>

          {/* Clerk: show Sign in link when signed out */}
          <SignedOut>
            <NavLink
              to="/login"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--ink)",
                color: "var(--bg)",
                textDecoration: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <User size={14} /> Sign in
            </NavLink>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
