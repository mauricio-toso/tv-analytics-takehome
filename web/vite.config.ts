import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy for /api → the Express server (server/index.ts, port 3000). Same-origin from the
// browser's point of view, so no CORS configuration is needed anywhere (PLAN §6).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
