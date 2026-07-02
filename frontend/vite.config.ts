import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PAGES=true builds the static GitHub Pages bundle: base = repo path, no backend.
const pages = process.env.PAGES === "true";

export default defineConfig({
  base: pages ? "/Genshin-Impact-Loadout-Manager-Speckit/" : "/",
  define: {
    "import.meta.env.VITE_STATIC": JSON.stringify(pages),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend (Docker-free local dev) — avoids CORS.
      // Override the target with VITE_PROXY_TARGET when the backend runs on a non-default port.
      "/api": { target: process.env.VITE_PROXY_TARGET ?? "http://localhost:3000", changeOrigin: true },
    },
  },
});
