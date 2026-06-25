import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

const queryClient = new QueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Hash routing on GitHub Pages (no server to handle deep links); path routing in dev.
const Router = import.meta.env.VITE_STATIC ? HashRouter : BrowserRouter;

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </StrictMode>,
);
