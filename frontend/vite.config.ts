import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PAGES=true builds the static GitHub Pages bundle: base = repo path, no backend.
const pages = process.env.PAGES === "true";

// Proxy API calls to the backend (Docker-free local dev) — avoids CORS. Override the target
// with VITE_PROXY_TARGET when the backend runs on a non-default port. Shared by `vite dev`
// and `vite preview`.
const apiProxy = {
  "/api": { target: process.env.VITE_PROXY_TARGET ?? "http://localhost:3000", changeOrigin: true },
};

export default defineConfig({
  base: pages ? "/Genshin-Impact-Loadout-Manager-Speckit/" : "/",
  define: {
    "import.meta.env.VITE_STATIC": JSON.stringify(pages),
  },
  plugins: [react()],
  server: { port: 5173, proxy: apiProxy },
  // `vite preview` does NOT inherit `server.proxy`, so it needs its own copy. The E2E suite
  // serves a production build through preview (see frontend/playwright.config.ts) — a dev
  // server transforms modules on demand, which starves heavy lazy routes under parallel load.
  preview: { port: 4173, proxy: apiProxy },
});
