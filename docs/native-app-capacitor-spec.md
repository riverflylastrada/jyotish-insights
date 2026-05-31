# Devin task spec — Native iOS/Android app via Capacitor

**Goal:** Ship Acharya Jyotish as real iOS and Android **app-store apps** with
**full feature parity** to the web app, by wrapping the existing React/Vite build
in [Capacitor](https://capacitorjs.com). No UI rewrite — the native app loads the
same `dist/` build in a native WebView, so every page, chart, the Guru debate,
the Voice AI Guru, PDF reports, and offline chart viewing work unchanged.

> **Why Capacitor, not React Native:** the app is a React 18 + Vite SPA with
> heavy custom SVG Kundli renderers and a large interactive Research Lab. A React
> Native rewrite would rebuild all of that UI (different primitives, no DOM) for
> weeks with real risk. Capacitor reaches full parity immediately and adds native
> APIs (push, deep links, mic) via plugins. This spec is Capacitor only.

---

## Repo facts (don't re-discover)

- **Stack:** React 18, Vite 5.4.19 (`@vitejs/plugin-react-swc`), TypeScript 5.8,
  Tailwind, shadcn/ui. Build output: **`dist/`**. Package manager: **npm**
  (`npm ci`, `npm run build`). Router: `react-router-dom` v6 (`BrowserRouter`).
- **Backend:** Supabase (Postgres + Auth + Edge Functions on Deno). Client in
  [src/integrations/supabase/client.ts](../src/integrations/supabase/client.ts) —
  `auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }`.
  Auth is **email/password** (no OAuth). Supabase URL/key come from
  `VITE_SUPABASE_*` env vars, baked at build time (see [.do/app.yaml](../.do/app.yaml)).
  > ⚠️ `client.ts` is marked "automatically generated — do not edit directly."
  > Do native auth-storage changes by wrapping/extending, not by hand-editing it.
- **PWA already shipped** (PR #88, live): `vite-plugin-pwa` service worker +
  manifest + icons in [vite.config.ts](../vite.config.ts), SW registered in
  [src/main.tsx](../src/main.tsx) via [src/pwa.ts](../src/pwa.ts), and **offline
  chart viewing** via React Query persisted to IndexedDB in
  [src/lib/queryClient.ts](../src/lib/queryClient.ts). Icons were generated from
  [public/icon-source.svg](../public/icon-source.svg) by
  [pwa-assets.config.ts](../pwa-assets.config.ts).
- **Voice AI Guru** uses ElevenLabs Conversational AI over **WebRTC** and needs
  **microphone** access — [src/hooks/useVoiceSession.ts](../src/hooks/useVoiceSession.ts),
  [src/components/voice/VoiceGuru.tsx](../src/components/voice/VoiceGuru.tsx).
- **Transit alerts** exist in-app (`transit-scan` edge function + `transit_alerts`
  table + notification bell). Native push is the natural extension (Phase 2 here).

---

## Constraints & conventions

- Branch off `main` as `feat/capacitor-native` (or similar). Open a **PR**; CI
  ([.github/workflows/ci.yml](../.github/workflows/ci.yml): `tsc` + `vitest` +
  `build`, plus Deno edge tests) **must stay green**. Do not break the web build.
- **Additive & web-safe:** every change must be guarded so the **web build is
  unchanged**. Use `Capacitor.isNativePlatform()` to branch native-only behavior.
  The same `dist/` must keep working as the deployed PWA.
- Do **not** bump `CURRENT_SNAPSHOT_VERSION` or touch the astrology engine.
- App identity: appId **`com.acharyajyotish.app`**, appName **`Acharya Jyotish`**.

---

## Phase 1 — Buildable native shell (core parity)

### 1.1 Install & init Capacitor
```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npx cap init "Acharya Jyotish" com.acharyajyotish.app --web-dir dist
npm i @capacitor/ios @capacitor/android
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

### 1.2 `capacitor.config.ts` (repo root)
- `appId: 'com.acharyajyotish.app'`, `appName: 'Acharya Jyotish'`, `webDir: 'dist'`.
- `server`: leave default (app served from `capacitor://localhost` on iOS /
  `http://localhost` on Android). Do **not** point `server.url` at the live site —
  bundle assets locally so the app works offline and passes store review.
- Plugin config for SplashScreen + StatusBar (added below).

### 1.3 Disable the service worker on native (critical)
Inside Capacitor the WebView loads bundled local assets, so the PWA service
worker is redundant and can serve **stale** assets after an app update. Guard SW
registration so it runs on web only. In [src/main.tsx](../src/main.tsx):
```ts
import { Capacitor } from '@capacitor/core';
if (import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  import('./pwa').then((m) => m.registerPwa());
}
```
> Keep the IndexedDB React Query persistence ([src/lib/queryClient.ts](../src/lib/queryClient.ts))
> — it is app-level and gives offline chart viewing inside the native app too.

### 1.4 App icons & splash
Generate native icons/splash from the existing brand source:
```bash
npm i -D @capacitor/assets
# Use public/icon-source.svg (maroon field + gold sun) as the source.
npx capacitor-assets generate --iconBackgroundColor '#6B1F2A' --splashBackgroundColor '#FBF8F1'
```
Verify icons land in `ios/App/App/Assets.xcassets` and `android/.../res/`.

### 1.5 Status bar & safe areas
```bash
npm i @capacitor/status-bar @capacitor/splash-screen
```
The web app already uses `env(safe-area-inset-*)` (bottom tab bar, offline
banner). Set the StatusBar style to match the maroon theme; ensure the WebView
respects safe areas (iOS `viewport-fit=cover` is already in
[index.html](../index.html)).

### 1.6 Microphone for the Voice AI Guru
- **iOS:** add `NSMicrophoneUsageDescription` to `ios/App/App/Info.plist`
  ("Acharya Jyotish uses the microphone to let you talk to the Voice Guru.").
  Ensure WKWebView allows WebRTC capture (Capacitor 6 enables `getUserMedia` in
  WKWebView; verify `allowsInlineMediaPlayback` and that mic permission prompts).
- **Android:** add `<uses-permission android:name="android.permission.RECORD_AUDIO"/>`
  to `android/app/src/main/AndroidManifest.xml`; request runtime permission
  before the first Voice session (use `@capacitor/core` or
  `@capacitor-community/...` permission API). Confirm WebRTC works in the Android
  System WebView.
- Acceptance: starting a Voice Guru session prompts for mic and connects.

### 1.7 Auth deep links (email confirm / password reset)
Email confirmation and password-reset links open a URL with Supabase tokens.
Native apps must catch that via a custom scheme / App Link and complete the
session in-app:
- Register a URL scheme / Android App Link + iOS Universal Link for
  `com.acharyajyotish.app` (e.g. scheme `acharyajyotish://auth`).
- Add `@capacitor/app` and listen for `appUrlOpen`; parse the
  `access_token`/`refresh_token` (or `code`) from the deep link and call
  `supabase.auth.setSession(...)` / `exchangeCodeForSession(...)`.
- Set the corresponding **Supabase Auth redirect URLs** (in the Supabase
  dashboard — human step, document the exact values).
- Acceptance: tapping a password-reset link on the device opens the app and lands
  the user authenticated.

### Phase 1 acceptance criteria (all must pass)
- `npm run build && npx cap sync` succeeds; web CI stays green.
- `npx cap run ios` and `npx cap run android` launch the app on
  simulator/emulator and load the full UI (not a blank WebView).
- **Login** (email/password) works; session **persists across app restarts**.
- A **saved chart opens**; with the device in **airplane mode**, re-opening a
  previously-opened chart still renders (IndexedDB offline path).
- **Guru debate** streams; **PDF report** opens; **Voice Guru** prompts for mic
  and connects.
- No console errors about a service worker trying to control the WebView.

---

## Phase 2 — Native push for transit alerts (optional follow-up)
- `npm i @capacitor/push-notifications`; register for push, capture the device
  token, store it server-side (new column/table keyed to the user).
- Extend the existing `transit-scan` flow to send a push (APNs/FCM) when a
  `transit_alerts` row is created, in addition to the in-app bell.
- Requires a **Firebase project (FCM)** for Android and an **APNs key** for iOS
  (human steps — document them).
- Acceptance: a newly-detected transit event delivers a device push that
  deep-links into the relevant chart sub-page.

---

## Out of scope for Devin (human / credentialed steps)
These cannot be automated and must be done by the account owner:
- **Apple Developer Program** ($99/yr) and **Google Play Console** ($25 once).
- **Code signing**: iOS certificates + provisioning profiles; Android keystore.
- **Supabase dashboard** changes: adding the native auth redirect URLs.
- **FCM/APNs** credentials (Phase 2).
- **Store listings** (screenshots, copy, privacy labels) and **review submission**.

Devin should deliver the app to a **buildable, runnable, testable** state
(simulator/emulator) with everything above wired, plus a short `RUNBOOK` section
in the PR describing the exact human steps and the values to enter.

---

## Notes / gotchas specific to this app
- **Generated supabase client:** prefer swapping auth storage to
  `@capacitor/preferences` only if needed; `localStorage` works in the WebView.
  If you do swap it, wrap the client rather than hand-editing the generated file.
- **Share links** (`share_token`) build `https://acharyajyotish.com/...` URLs —
  fine to keep pointing at the web domain; optionally make them Universal Links
  so they open in-app.
- **CSP / allowed origins:** ensure the WebView permits Supabase
  (`*.supabase.co`), ElevenLabs, Open-Meteo (`geocoding-api.open-meteo.com`), and
  Google Fonts.
- **Don't** set `server.url` to the production site — bundle `dist` locally
  (offline support + store-review compliance).
- Keep all native-only logic behind `Capacitor.isNativePlatform()` so the PWA
  build remains byte-compatible with what's deployed today.
