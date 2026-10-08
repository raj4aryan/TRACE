import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy keeps the browser and API on one origin, so the trace_token cookie just works (no CORS setup).
// Change the port to match your Express server. If your backend mounts routes under /api, delete the rewrite line.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3500",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});