import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initAuthCachePurge } from "@/lib/queryClient";
import "./index.css";

// Clear persisted chart data when the user signs out / switches accounts.
initAuthCachePurge();

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker only in production. The dynamic import keeps
// the `virtual:pwa-register` module out of the dev/test graph (it is provided
// by vite-plugin-pwa at build time only).
if (import.meta.env.PROD) {
  import("./pwa").then((m) => m.registerPwa());
}
