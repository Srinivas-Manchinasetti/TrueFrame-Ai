import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // FastAPI backend, once it's running (Phase 1 of the roadmap)
      "/api": "http://localhost:8000",
    },
  },
});
