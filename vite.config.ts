import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null, // we register manually in src/pwa.ts
      // Do NOT run the service worker in `vite dev` — it confuses HMR and could
      // cache the dev Supabase project's responses. Validate via `build && preview`.
      devOptions: { enabled: false },
      includeAssets: ["favicon.svg", "favicon.ico", "robots.txt", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Acharya Jyotish",
        short_name: "Acharya",
        description: "Professional Vedic Astrology — Eight Gurus, One Verdict",
        lang: "en",
        theme_color: "#6B1F2A", // brand maroon
        background_color: "#FBF8F1", // cream canvas (--bg-canvas)
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "New Chart", short_name: "New Chart", url: "/app/new" },
          { name: "My Charts", short_name: "Library", url: "/app/library" },
          { name: "Today's Panchang", short_name: "Panchang", url: "/panchang" },
        ],
      },
      workbox: {
        // Precache same-origin build output only.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        globIgnores: ["**/*.map", "**/placeholder.svg"], // placeholder.svg (28KB) is unused at runtime
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // many lazy-loaded route chunks
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // prompt flow: wait for the user to click Reload
        // SPA deep-link support offline. Deny app-shell fallback for API-shaped
        // paths and any request that targets a file with an extension.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/, /^\/functions/, /\/[^/?]+\.[^/]+$/],
        // Runtime caching — DELIBERATELY no *.supabase.co entry: REST/auth/edge
        // POSTs stay network-only (Workbox only handles GET; offline charts come
        // from the React Query IndexedDB cache, not from caching Supabase here).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Birthplace autocomplete (NewChart / Mundane / Panchang / BusinessNew)
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo-geocoding",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "@tanstack/react-query-persist-client",
      "@tanstack/query-async-storage-persister",
    ],
  },
}));
