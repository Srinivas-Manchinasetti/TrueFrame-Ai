import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { ScanLine, ShieldCheck, Zap, Globe } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const from = location.state?.from?.pathname || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: "var(--ink)",
              color: "white",
              padding: 8,
              borderRadius: 8,
              display: "flex",
            }}
          >
            <ScanLine size={20} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-head)",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: -0.5,
            }}
          >
            TrueFrame AI
          </span>
        </div>

        {/* Clerk's pre-built SignIn component — Clerk v5 */}
        <SignIn
          forceRedirectUrl={from}
          appearance={{
            variables: {
              colorPrimary: "#14181f",
              colorBackground: "#ffffff",
              colorText: "#14181f",
              colorInputBackground: "#f9fafb",
              colorInputText: "#14181f",
              borderRadius: "8px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
            },
            elements: {
              card: {
                boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
              },
              headerTitle: {
                fontFamily: "Fraunces, Georgia, serif",
                fontSize: "24px",
                fontWeight: "700",
                letterSpacing: "-0.5px",
              },
              headerSubtitle: {
                fontSize: "13.5px",
                color: "#6b7280",
              },
              socialButtonsBlockButton: {
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: "500",
                height: "44px",
              },
              dividerLine: {
                backgroundColor: "#e5e7eb",
              },
              formButtonPrimary: {
                backgroundColor: "#14181f",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                height: "44px",
                "&:hover": {
                  backgroundColor: "#2a2f3a",
                },
              },
              footerActionLink: {
                color: "#14181f",
                fontWeight: "500",
              },
            },
          }}
        />

        {/* Feature badges */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: <ShieldCheck size={13} />, label: "Secure sessions" },
            { icon: <Globe size={13} />, label: "MongoDB Atlas sync" },
            { icon: <Zap size={13} />, label: "Instant results" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--slate)",
              }}
            >
              {icon}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
