import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import ImageCheck from "./pages/ImageCheck.jsx";
import VideoCheck from "./pages/VideoCheck.jsx";
import History from "./pages/History.jsx";
import Login from "./pages/Login.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-body)" }}>
          <h2 style={{ color: "var(--fake, #b8432d)" }}>Something went wrong.</h2>
          <p style={{ color: "var(--slate, #666)", maxWidth: 500, margin: "12px auto" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 18px",
              background: "var(--ink, #14181f)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginTop: 16,
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/image" element={<ImageCheck />} />
              <Route path="/video" element={<VideoCheck />} />
              <Route path="/history" element={<History />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
