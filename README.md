# Acharya Jyotish

> **Eight Gurus. One Chart. The Truth in Your Stars.**

Acharya Jyotish (repo: `jyotish-insights`) is a professional-grade Vedic astrology
platform. It computes a high-precision birth chart (Kundli) entirely from first
principles, then runs the chart through multiple classical schools of Jyotish
and synthesizes their readings into a single verdict via a multi-Guru "tribunal"
powered by an LLM.

Everything — planetary positions, divisional charts, dashas, yogas, doshas,
Ashtakavarga, Panchang, compatibility — is calculated in-house by a TypeScript
astronomy engine running on Supabase Edge Functions. No third-party astrology
API is required.

> **Vision:** Acharya Jyotish is an **Interactive Astrology Research Lab**, not a
> prediction engine — every claim shows its math and cites its classical source.
> Two modes: a deterministic **Research Lab** (explore the chart yourself) and
> the **Guru Consultation** debate engine. See [ROADMAP.md](ROADMAP.md#vision).

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [The calculation engine](#the-calculation-engine)
- [The Guru Debate engine](#the-guru-debate-engine)
- [The Voice AI Guru](#the-voice-ai-guru)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database & Edge Functions](#database--edge-functions)
- [Deployment](#deployment)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## Features

### Chart computation
- **Kundli generation** from name, date, time, and place of birth, with
  birthplace autocomplete and automatic timezone resolution (Open-Meteo
  geocoding + client-side timezone offset).
- **Unknown Birth Time support** — cast a chart without a known birth time via
  a Solar (Sun-as-Lagna), Moon (Moon-as-Lagna), or **KP Horary (1–249)** chart
  basis.
- **23 divisional charts (Vargas)** — D1 (Rasi) through D144 (Dwadas-Dwadasamsa)
  with per-varga significance and interpretation, including D5 (Panchamsa),
  D6 (Shashthamsa), D8 (Ashtamsa), D11 (Rudramsa), and three high-divisional
  vargas: D81 (Nava-Navamsa), D108 (Ashtottaramsa), and D144 (Dwadas-Dwadasamsa).
- **Dasha systems** — **Vimshottari** (120-yr, three sub-period levels Maha →
  Antar → Pratyantar, live "now" marker), plus **Yogini**
  (36-yr), **Ashtottari** (108-yr), **Kalachakra**, **Jaimini Chara**
  (Maha + Antar), **Narayana / नारायण** (Padakrama rasi dasha),
  **Lagna Kendradi / लग्न केन्द्रादि** (strength-ordered rasi dasha), and
  **Sudasa / सुदशा** (wealth dasha from D-2 Hora) — all JHora-validated.
- **Yogas** — 44 classical yogas (Raja, Dhana, Pancha Mahapurusha, etc.) with
  cancellation/negation rules, strength rating, and the planetary combinations
  that form them.
- **Doshas** — Mangal, Kaal Sarp, Sade Sati, Pitra, Guru Chandal, and Shakat
  detection with severity, affected life areas, and cancellations.
- **Ashtakavarga** — full Bhinnashtakavarga (per-planet) and Sarvashtakavarga
  (aggregate) bindu tables, rendered as a house-strength heatmap.
- **Panchang** — Tithi, Vara, Nakshatra, Yoga, and Karana, plus sunrise/sunset.
- **Muhurta (electional)** — Choghadiya, Hora, Rahu Kaal, Gulika Kaal and other
  auspicious/inauspicious timing windows for a chosen day and place.
- **Shadbala** — the full classical six-source strength (Sthana, Dig, Kala,
  Cheshta, Naisargika, Drik bala) in Rupas/Virupas with required minimums and
  rank, plus **Ishta/Kashta phala** and **Vimsopaka bala**, **validated against
  Jagannatha Hora to within ±0.03 Rupa**.
- **Bhava Bala** — strength of each of the 12 houses (Bhavadhipathi + Dig +
  Drishti bala) in Rupas, JHora-validated.
- **Vargeeya Bala** — divisional strength: Pancha-vargeeya (5-varga) and
  Dwadasa-vargeeya (favorable placements across D1–D12), JHora-validated.
- **Varshphal (Tajik annual chart)** — the solar-return chart, Muntha, Year
  Lord (Varshesh via full Panchavargeeya-Bala tie-break), and **Tajik yogas**
  (Ithasala, Eesarpha, Ishkavala, Induvara, Nakta, Yamaya) — JHora-validated.
- **KP (Krishnamurti Paddhati)** — sign-lord / star-lord / sub-lord for every
  planet, **Placidus cuspal sub-lords**, KP Ruling Planets, and the **4-fold
  house significators** (with Rahu/Ketu node agency).
- **Jaimini** — 8 Chara Karakas (Atmakaraka → Darakaraka, with Rahu reversed),
  Karakamsa, Arudha Padas (Arudha Lagna, Upapada), **Chara Dasha** (KN Rao, Maha
  + antardasha), **Special Lagnas** (Bhava/Hora/Ghati/Vighati/Pranapada/Sree),
  and **Argala** / Virodha Argala — all JHora-validated.
- Selectable **Ayanamsa** (Lahiri — calibrated to Swiss Ephemeris — Raman,
  Krishnamurti, Yukteshwar), **house system** (Whole Sign, Placidus, Koch,
  Sripati, Equal), and chart style (North / South Indian).
- **Self-updating snapshots** — saved charts carry an engine version and
  auto-recalculate when the engine gains new data, so old charts gain new
  features (e.g. KP/Jaimini) without a manual recalculation.

> **Engine vs. UI:** every calculation above is computed by the engine, fed into
> the Guru Debate dossier, and surfaced in dedicated front-end views — the
> **Strengths** (Shadbala / Bhava Bala / Vargeeya Bala), **KP**, **Jaimini**,
> **Varshphal**, and multi-system **Dashas** pages all ship. The **Interactive
> Research Lab** (`/app/chart/:id/lab`) is **feature-complete** — all five
> phases shipped: Interactive D1, Yogas, Doshas (with structured
> conditions/cancellations), Dasha, Divisional with cross-chart navigation,
> Ashtakavarga, Shadbala, KP, Transits, 108 classical planet-in-house templates,
> and per-chart pre-computed Guru snapshots — each with Visual / Explain / Math
> Proof depth layers and classical citations. Alongside, all four **Specialized
> Kundli types** ship — Prashna (`/app/prashna`), Twins (`/app/twins/new`),
> Business (`/app/business/new`), and **public** Mundane (`/mundane`). Next:
> monetization. See [ROADMAP.md](ROADMAP.md#immediate--interactive-research-lab).

### Interpretation & analysis
- **Voice AI Guru** — *talk to* an AI Jyotishi live (Hindi-first) via ElevenLabs
  Conversational AI. The edge function injects the same authoritative chart
  dossier into the agent before the call, so the Guru already knows every
  position, dasha, and yoga and never asks you to repeat birth details. One base
  agent serves multiple personas — voice, persona prompt, greeting, and dossier
  switch per session via `conversation_config_override` (Phase 1: Parashara Muni,
  Devi Saraswati, KP Master). From the Dashboard (no chart loaded) the Guru asks
  for birth details and computes the chart live via tool calls. See
  [The Voice AI Guru](#the-voice-ai-guru).
- **Multi-Guru Debate** — pose a question and stream parallel readings from up
  to eight classical and modern masters (Parashara, Varahamihira, B. V. Raman,
  K. N. Rao, K. S. Krishnamurti, Jaimini, Mantreshwara, Kalyanavarman), then a
  Master Acharya synthesizes a final verdict noting consensus and dissent.
  Multi-turn follow-up conversation and a scrollable trial-history log are
  supported. Every reading is **grounded in a full chart dossier** (live
  transits, the computed Sade Sati phase, dashas, yogas/doshas, KP and Jaimini
  data) with an anti-hallucination guardrail and automatic retry on truncated
  responses — so gurus reason from real data instead of inventing positions.
- **Transits (Gochara)** — an interactive bi-wheel overlaying today's planets
  onto the natal chart, with houses computed from both Lagna and Moon, plus
  Sade Sati and double-transit indicators.
- **Compatibility (Kundli Milan)** — the 36-point Ashta Koota matching system
  (Varna, Vasya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi), tuned to match
  AstroSage results, with per-Koota breakdown and remedial guidance.
- **Remedies** — planet-specific gemstones, mantras, donations, fasts, and
  practices ranked by affliction.
- **Lal Kitab remedies** — a dedicated, chart-driven page of house-based totke
  (upay). For each of the 9 grahas in the house it occupies in D1, a 108-cell
  static map gives the Lal Kitab effect and the traditional remedy, sourced
  cell-by-cell from *Lal Kitab — Pt. Radhakrishna Shrimali* (Diamond Pocket
  Books, 2013) with per-house citations. Deterministic; no LLM.
- **Reports** — printable, citation-backed HTML/PDF dossier of the full chart.

### Free self-service tools (public, bilingual EN + हिन्दी)
No-auth, deterministic tools (**no LLM**) that grow the top of the funnel and serve
casual users — each available in English at the bare path and in Hindi at a `/hi`
route prefix, with `hreflang` alternates emitted by [Seo.tsx](src/components/Seo.tsx):
- **Rashifal (राशिफल)** — daily & monthly horoscope for all 12 moon-signs, computed
  from the **real transit (gochar)** of the Moon (daily, Chandra gochar) and Sun
  (monthly, Surya gochar), favourability per *Phaladeepika* Ch. 26 — not generic
  blurbs. Routes `/rashifal`, `/hi/rashifal`
  ([rashifal.ts](src/lib/astro/rashifal.ts)).
- **Numerology (अंक ज्योतिष)** — Pythagorean Life Path / Destiny / Soul Urge /
  Personality numbers (master numbers preserved) with the associated graha and lucky
  colour/day. `/numerology` ([numerology.ts](src/lib/numerology.ts)).
- **Baby Names (नामकरण)** — the auspicious naming syllable (akshara) from the birth
  Moon's nakshatra-pada (108-cell map) plus matching bilingual name suggestions.
  `/baby-names` ([babyNameData.ts](src/lib/astro/babyNameData.ts)).
- **Tarot** — a full 78-card Rider–Waite deck with a deterministic (seeded) Card of
  the Day and a three-card past–present–future spread. `/tarot`
  ([tarot.ts](src/lib/tarot.ts)).

### Platform
- **Email/password auth** via Supabase, with per-user profiles and preferences.
- **Bilingual public pages** (EN + हिन्दी) via a lightweight route-prefix i18n layer
  ([src/lib/i18n/locale.ts](src/lib/i18n/locale.ts)) — Hindi at `/hi/...`, with
  per-locale canonical + `hreflang`. Full in-app (`/app/*`) translation is the
  planned next i18n track.
- **Chart library** — save, open, share, and delete charts.
- **Public share pages** — share a chart read-only via a secret share token.
- **Installable PWA (mobile app)** — add Acharya Jyotish to the home screen and
  run it full-screen. **Offline chart viewing**: opened charts persist to
  IndexedDB (the React Query cache) and stay readable with no network; only the
  app shell and your own chart snapshots are cached — Supabase auth and LLM/voice
  calls stay online-only. A bottom tab bar, safe-area insets, an offline banner,
  and an install prompt give it a native feel. Updates surface as a "new version"
  reload toast. See [vite.config.ts](vite.config.ts), [src/pwa.ts](src/pwa.ts),
  and [src/lib/queryClient.ts](src/lib/queryClient.ts).
- **Admin panel** — user management, API-key storage, LLM provider/model
  configuration, and usage stats, gated behind an `admin` role.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript + Tailwind + shadcn/ui)        │
│  • Pages: Dashboard, NewChart, ChartDetail, Dashas, Yogas,   │
│    Doshas, Ashtakavarga, Transits, Compatibility, Debate,    │
│    Voice, Remedies, Lal Kitab, Report, Library,              │
│    Settings, Admin/*                                         │
│  • State: Zustand stores + TanStack Query                    │
│  • Astro provider abstraction (mock | vedicrishi | custom)   │
└───────────────┬─────────────────────────────────────────────┘
                │  supabase-js (auth + RPC + function invoke)
┌───────────────▼─────────────────────────────────────────────┐
│  Supabase                                                    │
│  • Postgres: profiles, charts, app_settings (+ RLS, RPCs)    │
│  • Auth: email/password, auto-profile-on-signup trigger      │
│  • Edge Functions (Deno):                                    │
│      - calculate-kundli  → in-house Vedic astronomy engine   │
│      - guru-debate       → streams LLM readings + verdict    │
│      - voice-session     → ElevenLabs token + dossier override│
│      - voice-tools       → agent tool webhook (live compute)  │
│      - render-report     → HTML/PDF report                   │
└──────────────────────────────────────────────────────────────┘
        │ signed token + system-prompt override (no API key)
┌───────▼──────────────────────────────────────────────────────┐
│  ElevenLabs Conversational AI (one base agent, voice over     │
│  WebRTC) — @elevenlabs/react in the browser                   │
└──────────────────────────────────────────────────────────────┘
```

The frontend never talks to an external astrology API directly. Chart math is
done server-side in `calculate-kundli`; LLM calls are proxied through
`guru-debate`, and ElevenLabs calls through `voice-session`, so API keys stay on
the server — the browser only ever receives a short-lived conversation token.

---

## Tech stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React 18, Vite 5, TypeScript 5 |
| Styling / UI | Tailwind CSS 3, shadcn/ui (Radix primitives), Framer Motion, Lucide icons |
| State / data | Zustand, TanStack Query, React Hook Form + Zod |
| Charts       | Recharts, custom SVG Kundli renderers |
| Backend      | Supabase (Postgres, Auth, Storage, Edge Functions on Deno) |
| AI (text)    | OpenAI-compatible chat completions (default Google Gemini `gemini-2.5-flash`), streamed via SSE |
| AI (voice)   | ElevenLabs Conversational AI (`@elevenlabs/react`, WebRTC); the conversation LLM runs inside the agent |
| Tooling      | Vitest + Testing Library, ESLint, Bun/npm |
| Deploy       | Docker (multi-stage Node build → nginx) and DigitalOcean App Platform |

This project was scaffolded with [Lovable](https://lovable.dev).

---

## The calculation engine

Located in [supabase/functions/calculate-kundli/](supabase/functions/calculate-kundli/),
the engine is a self-contained, dependency-free Vedic astrology library written
in TypeScript:

| Module | Responsibility |
|--------|----------------|
| [astronomy.ts](supabase/functions/calculate-kundli/astronomy.ts) | Julian Day, ascendant, sidereal time (apparent), obliquity/nutation, retrogression, sunrise/sunset |
| [vsop87.ts](supabase/functions/calculate-kundli/vsop87.ts) | VSOP87D planetary positions (Sun–Saturn) with light-time + aberration |
| [elp82.ts](supabase/functions/calculate-kundli/elp82.ts) | ELP-2000/82 Moon, IAU 1980 nutation, true/mean node |
| [vedic.ts](supabase/functions/calculate-kundli/vedic.ts) | Ayanamsa, sidereal conversion, nakshatra/pada, whole-sign houses, dignity, combustion |
| [divisional.ts](supabase/functions/calculate-kundli/divisional.ts) | All 16 divisional (Varga) charts |
| [dashas.ts](supabase/functions/calculate-kundli/dashas.ts) | Vimshottari Dasha to three levels (Maha → Antar → Pratyantar) |
| [yogini.ts](supabase/functions/calculate-kundli/yogini.ts) | Yogini Dasha (36-yr), Maha + Antar |
| [ashtottari.ts](supabase/functions/calculate-kundli/ashtottari.ts) | Ashtottari Dasha (108-yr), Maha + Antar |
| [kalachakra.ts](supabase/functions/calculate-kundli/kalachakra.ts) | Kalachakra Dasha (nakshatra-pada Savya/Apasavya) |
| [yogas.ts](supabase/functions/calculate-kundli/yogas.ts) | Classical yoga detection |
| [doshas.ts](supabase/functions/calculate-kundli/doshas.ts) | Dosha detection + remedies |
| [ashtakavarga.ts](supabase/functions/calculate-kundli/ashtakavarga.ts) | Bhinna- and Sarva-ashtakavarga |
| [panchang.ts](supabase/functions/calculate-kundli/panchang.ts) | Tithi, Vara, Nakshatra, Yoga, Karana |
| [kp.ts](supabase/functions/calculate-kundli/kp.ts) | KP sub-lords, Placidus cuspal sub-lords, Ruling Planets, 4-fold house significators |
| [jaimini.ts](supabase/functions/calculate-kundli/jaimini.ts) | Chara Karakas, Karakamsa, Arudha Padas, Chara Dasha (KN Rao, Maha + Antar) |
| [special_lagna.ts](supabase/functions/calculate-kundli/special_lagna.ts) | Special Lagnas (Bhava/Hora/Ghati/Vighati/Pranapada/Sree) + Argala |
| [shadbala.ts](supabase/functions/calculate-kundli/shadbala.ts) | Six-source Shadbala + Ishta/Kashta phala in Rupas (JHora-validated) |
| [vimsopaka.ts](supabase/functions/calculate-kundli/vimsopaka.ts) | Vimsopaka bala (Shodasavarga dignity score) |
| [bhavabala.ts](supabase/functions/calculate-kundli/bhavabala.ts) | Bhava Bala (house strength) in Rupas (JHora-validated) |
| [vargeeya_bala.ts](supabase/functions/calculate-kundli/vargeeya_bala.ts) | Pancha- & Dwadasa-vargeeya divisional strength (JHora-validated) |
| [varshphal.ts](supabase/functions/calculate-kundli/varshphal.ts) | Varshphal: annual chart, Muntha, Year Lord (JHora-validated) |
| [tajik_yogas.ts](supabase/functions/calculate-kundli/tajik_yogas.ts) | Tajik yogas on the annual chart (Ithasala, Eesarpha, …) |
| [engine.ts](supabase/functions/calculate-kundli/engine.ts) | Orchestrator → assembles the full `KundliData` (version-stamped) |

Planetary positions use **VSOP87** (planets) and **ELP-2000/82** (Moon) with
nutation and a true node — matching **Swiss Ephemeris to the arc-minute** (the
parity harness asserts ≤0.05° for planets, ≤0.1° for the Moon). Shadbala matches
Jagannatha Hora to within ±0.03 Rupa.

> **Provider abstraction.** The frontend ([src/lib/astro/](src/lib/astro/))
> defines an `AstroProvider` interface with `mock`, `vedicrishi`, and `custom`
> implementations selected via `VITE_ASTRO_PROVIDER`. `custom` routes to the
> in-house edge function; `mock` returns demo data for offline development.

---

## The Guru Debate engine

[supabase/functions/guru-debate/index.ts](supabase/functions/guru-debate/index.ts)
exposes two modes:

- **`guru`** — given a chart, a question, and a guru id, it builds a full
  **chart dossier** and streams an in-character reading from that guru's system
  prompt.
- **`verdict`** — given the prior readings, the Acharya produces a final
  synthesis, explicitly naming consensus and dissent.

The dossier ([dossier.ts](supabase/functions/guru-debate/dossier.ts)) is a
modular, ~26-section context builder — today's date, **server-computed live
transits** (houses from both Lagna and Moon), the **authoritative Sade Sati
phase**, natal planet table, house lordships, multi-level dashas, yogas/doshas,
Ashtakavarga, Shadbala, Panchang, divisional summaries, and the **KP** and
**Jaimini** sections. It is reused verbatim by the Voice AI Guru. A grounding
guardrail ([grounding.ts](supabase/functions/guru-debate/grounding.ts), shared
with voice) forbids inventing positions or
dates and tells gurus to state computed values (e.g. the Sade Sati phase)
verbatim. This fixed a class of bugs where gurus would hallucinate
contradictory planetary positions on transit-sensitive questions.

Readings stream over SSE so the UI fills in live and runs the gurus in parallel;
the client captures `finish_reason` and **retries truncated readings** up to
twice. The LLM endpoint, model, and API key are read from `app_settings`
(configurable in the Admin panel) with a `GOOGLE_AI_KEY` environment fallback.

---

## The Voice AI Guru

A live, **Hindi-first** voice conversation with an AI Jyotishi, powered by
**ElevenLabs Conversational AI**. The conversation LLM runs *inside* the
ElevenLabs agent; our role is to (a) mint a connection token and (b) build the
per-session **system-prompt override** — so the Guru is grounded on the same
authoritative dossier as the text debate and never invents data.

**One base agent, many personas.** Rather than one agent per Guru, a single
ElevenLabs agent (tools + knowledge base configured once) is re-skinned per
session via `conversation_config_override`: voice (`tts.voiceId/speed/stability`),
system prompt, first message, and language all switch based on the selected
persona. Personas live in
[voice-session/personas.ts](supabase/functions/voice-session/personas.ts)
(8 total, phased — Phase 1: Parashara Muni, Devi Saraswati, KP Master) with
display metadata + availability flags in
[src/config/guruVoices.ts](src/config/guruVoices.ts).

Two edge functions back it:

- **[voice-session](supabase/functions/voice-session/index.ts)** — `get-signed-url`
  mints a WebRTC **conversation token** (signed-URL/WebSocket fallback) and
  assembles `overrides` = persona prompt + shared grounding +
  `buildChartDossier(...)` + voice; `log-session` records a row in
  `voice_sessions`; `get-usage` reports a soft monthly-minutes cap. The chart is
  sent by the client (the same `KundliData` it already holds) so the dossier
  builds for demo/unsaved/shared charts too.
- **[voice-tools](supabase/functions/voice-tools/index.ts)** — the webhook the
  agent calls mid-conversation to compute on demand (`compute_kundli`,
  `get_current_dasha`, `check_transits`, `detect_yogas`, `get_panchang`;
  compatibility is an honest stub pending a gun-milan engine). Because ElevenLabs
  can't present a Supabase JWT, it's secured by a shared-secret `X-Webhook-Secret`
  header.

The browser uses `@elevenlabs/react`'s `useConversation` and applies the
server-built `overrides` at `startSession`. Two flows: **chart-loaded** (Ask
Guruji on ChartDetail — the Guru opens already knowing the chart) and
**no-chart** (Dashboard "Talk to Guruji" — the Guru asks for birth details and
computes via tools). The ElevenLabs **API key + webhook secret** are stored in
`app_settings` (Admin → API Keys), and the **agent id, per-Guru voice ids, and
voice tuning** in Admin → Voice — all read server-side, no redeploy to change.

> **Security:** the ElevenLabs API key never reaches the browser; the client only
> gets a short-lived conversation token. The overridden agent fields (System
> prompt, First message, Language, Voice, and the voice tuning fields) must be
> enabled in the agent's **Security → Overrides** tab, or the SDK rejects them.

---

## Project structure

```
src/
  pages/
    app/           # Authenticated app: Dashboard, NewChart, ChartDetail,
                   #   Dashas, Doshas, Yogas, Ashtakavarga, Transits, Strengths,
                   #   KP, Jaimini, Varshphal, Muhurta, Compatibility, Debate,
                   #   Remedies, Lal Kitab, Report, Library, Settings
    app/           # ... + VoiceGuruPage (/app/voice, /app/voice/:chartId)
    admin/         # AdminDashboard, AdminUsers, AdminApiKeys, AdminLlmConfig, AdminVoice
    Index.tsx      # Marketing landing page
  components/
    kundli/        # KundliChart (N/S Indian SVG), KundliBiWheel (transit overlay)
    voice/         # VoiceGuru tray, VoiceWaveform, GuruSelector, VoiceButton
    layout/        # AppLayout, AdminLayout, SiteFooter, NavBadge
    auth/          # RequireAuth, RequireAdmin route guards
    ui/            # shadcn/ui primitives
  config/          # guruVoices.ts (voice persona display registry)
  lib/astro/       # Provider abstraction (factory, types, providers/, normalizers)
  hooks/           # useKundli, useSession, useAdmin, useVoiceSession, ...
  stores/          # useChartStore, useDebateStore, useUserStore, useVoiceStore (Zustand)
  integrations/    # Supabase client + generated types
supabase/
  functions/
    calculate-kundli/  # Vedic engine (astronomy, vedic, divisional, dashas,
                       #   yogas, doshas, ashtakavarga, panchang, kp, jaimini)
    guru-debate/       # LLM tribunal: index.ts + dossier.ts + grounding.ts
    voice-session/     # ElevenLabs token + per-session override (personas.ts)
    voice-tools/       # ElevenLabs agent tool webhook (live computation)
    render-report/     # HTML → PDF report (via PDFShift)
  migrations/      # Postgres schema + RLS + RPCs
Dockerfile         # Multi-stage build → nginx
.do/app.yaml       # DigitalOcean App Platform spec
```

---

## Getting started

### Prerequisites
- Node.js 20+ (or [Bun](https://bun.sh) — a `bun.lockb` is committed)
- A [Supabase](https://supabase.com) project (for full functionality)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (to run migrations
  and deploy functions)

### Install & run

```bash
# 1. Clone and install
git clone <repo-url> jyotish-insights
cd jyotish-insights
npm install            # or: bun install

# 2. Configure environment
cp .env.example .env
# edit .env (see below)

# 3. Start the dev server
npm run dev            # http://localhost:8080
```

With `VITE_ASTRO_PROVIDER=mock` the app runs fully offline against demo chart
data — handy for UI work without a Supabase backend.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Environment variables

Frontend (Vite — must be prefixed `VITE_`):

| Variable | Description |
|----------|-------------|
| `VITE_ASTRO_PROVIDER` | `mock` \| `vedicrishi` \| `custom` (use `custom` for the in-house engine) |
| `VITE_API_BASE_URL` | Backend proxy base URL (optional) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (safe to expose) |

Edge functions (set as Supabase secrets, **never** in the frontend):

| Secret | Description |
|--------|-------------|
| `GOOGLE_AI_KEY` | Fallback LLM API key for `guru-debate` (or configure via Admin → API Keys) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Used by `guru-debate` / `voice-session` to read config from `app_settings` |
| `ELEVENLABS_API_KEY` | ElevenLabs key for `voice-session` (preferred: set in Admin → API Keys; env is a fallback) |
| `ELEVENLABS_WEBHOOK_SECRET` | Shared secret `voice-tools` verifies on agent tool calls (preferred: Admin → API Keys; env fallback) |

---

## Database & Edge Functions

Core tables (see [supabase/migrations/](supabase/migrations/)):

- **`profiles`** — one per user, holds display name and chart preferences
  (ayanamsa, chart style, house system) and a `role` (`user` | `admin`).
  Auto-created on signup via the `handle_new_user` trigger.
- **`charts`** — saved charts: `birth_details` (JSONB), cached `snapshot`
  (JSONB, version-stamped — stale snapshots auto-recalculate on load), and a
  secret `share_token` for public read access.
- **`app_settings`** — admin-managed key/value config (LLM endpoint/model/API
  keys, **ElevenLabs key + webhook secret**, **voice** agent id / per-Guru voice
  ids + tuning), admin-only via RLS.
- **`voice_sessions`** — one row per completed voice conversation (guru, chart,
  language, duration, transcript), owner-scoped via RLS.

Row-Level Security restricts every row to its owner; public sharing is served
through the security-definer RPC `get_chart_by_share_token`. Admin views use the
`admin_get_users`, `admin_get_stats`, and `admin_get_voice_stats` RPCs.

Deploy the schema and functions with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy   # all functions (calculate-kundli, guru-debate,
                            #   voice-session, voice-tools, render-report, …)
supabase secrets set GOOGLE_AI_KEY=<your-key>
# ElevenLabs key + webhook secret are preferably set in Admin → API Keys instead.
```

> **First admin user:** set `role = 'admin'` on your profile row in the Supabase
> SQL editor: `update public.profiles set role = 'admin' where user_id = '<your-uuid>';`

---

## Deployment

Two paths are supported out of the box:

- **Docker** — multi-stage build (`node:20-alpine` → `nginx:alpine`). See
  [Dockerfile](Dockerfile) and [nginx.conf](nginx.conf):
  ```bash
  docker build -t acharya-jyotish .
  docker run -p 8080:80 acharya-jyotish
  ```
- **DigitalOcean App Platform** — static-site spec in [.do/app.yaml](.do/app.yaml),
  with `deploy_on_push` from `main`.

The Supabase database (migrations) is deployed via the Supabase CLI as shown
above. The **edge functions deploy automatically** on every push to `main` via
the `deploy-functions` job in [ci.yml](.github/workflows/ci.yml) — set these two
repository secrets to enable it (without them the job skips cleanly):

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | A personal access token from the Supabase dashboard (Account → Access Tokens) |
| `SUPABASE_PROJECT_REF` | The project ref (e.g. `bkdfseyhusoxiruhuhbs`) |

> **Why this matters:** the frontend's `CURRENT_SNAPSHOT_VERSION` and the engine's
> `snapshotVersion` must move together. If the functions aren't redeployed after a
> version bump, the UI advertises a new version while the deployed engine stamps
> the old one — and every saved chart gets stuck on a "Recalculate" banner that
> can never clear. To deploy the functions manually instead:
>
> ```bash
> supabase functions deploy   # all functions, or name one: calculate-kundli
> ```

---

## Testing

**Frontend** — [Vitest](https://vitest.dev) with Testing Library and jsdom
(config in [vitest.config.ts](vitest.config.ts), setup in
[src/test/setup.ts](src/test/setup.ts)), covering the SSE parsing + truncation
retry logic:

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

**Edge functions** — Deno tests for the engine and dossier, including a
**parity harness** ([parity_test.ts](supabase/functions/calculate-kundli/parity_test.ts))
that diffs computed charts against **Swiss Ephemeris** (positions) and
**Jagannatha Hora** (Shadbala) reference values for 3 reference charts:

```bash
deno test supabase/functions/calculate-kundli/ supabase/functions/guru-debate/
deno check supabase/functions/calculate-kundli/engine.ts
```

**CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs both suites
on every PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions
(parity-over-plausibility, snapshot version bumps) that all changes — human or
automated — follow.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned work. **The Interactive Research Lab
is feature-complete** — all five phases shipped, alongside all four
**Specialized Kundli types** (Prashna, Twins, Business, public Mundane), the
**Voice AI Guru** (live ElevenLabs conversation grounded on the chart dossier),
an **installable PWA** with offline chart viewing, and a set of **free bilingual
self-service tools** (Rashifal, Numerology, Tarot, Baby Names) on a new
route-prefix i18n foundation. Up next: **chart-grounded personalised AI Rashifal**
and **pro astrologer tools** (client CRM + white-label reports), **Razorpay
billing + plan gating**, a **pan-India multi-language launch**, the remaining
voice personas (Phases 2–3) + tool-calling flow, and the remaining engine items
(divisional expansion to 23+ vargas).

---

## Acknowledgements

Interpretations draw on classical source texts: *Brihat Parashara Hora Shastra*,
*Saravali*, *Phaladeepika*, the *Jaimini Sutras*, *Brihat Jataka*, and modern KP
literature. Astronomical algorithms follow Meeus, *Astronomical Algorithms*.

*सत्यमेव जयते*
