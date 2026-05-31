import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import { initAuthCachePurge } from "@/lib/queryClient";
import { initNativeAuthDeepLink } from "@/lib/native-auth-deeplink";
import "./index.css";

// Clear persisted chart data when the user signs out / switches accounts.
initAuthCachePurge();

// Listen for auth deep links on native (email-confirm / password-reset).
initNativeAuthDeepLink();

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker only in production on the web. Inside a
// native Capacitor WebView the SW is redundant (assets are bundled locally)
// and can serve stale content after an app update. The IndexedDB-based React
// Query persistence (offline chart viewing) is kept for both web and native.
if (import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  import("./pwa").then((m) => m.registerPwa());
}
