# Jyotish Sage

> **Five Gurus. One Chart. The Truth in Your Stars.**

Jyotish Sage (repo: `jyotish-insights`) is a professional-grade Vedic astrology
platform. It computes a high-precision birth chart (Kundli) entirely from first
principles, then runs the chart through multiple classical schools of Jyotish
and synthesizes their readings into a single verdict via a multi-Guru "tribunal"
powered by an LLM.

Everything — planetary positions, divisional charts, dashas, yogas, doshas,
Ashtakavarga, Panchang, compatibility — is calculated in-house by a TypeScript
astronomy engine running on Supabase Edge Functions. No third-party astrology
API is required.

> **Vision:** Jyotish Sage is an **Interactive Astrology Research Lab**, not a
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
- **16 divisional charts (Vargas)** — D1 (Rasi) through D60 (Shashtiamsa) with
  per-varga significance and interpretation.
- **Dasha systems** — **Vimshottari** (120-yr, five sub-period levels Maha →
  Antar → Pratyantar → Sookshma → Prana, live "now" marker), plus **Yogini**
  (36-yr), **Ashtottari** (108-yr), **Kalachakra**, and **Jaimini Chara**
  (Maha + Antar) — all JHora-validated.
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
> **Varshphal**, and multi-system **Dashas** pages all ship. The next UI phase
> turns these read-only views into an **Interactive Research Lab** — see
> [ROADMAP.md](ROADMAP.md#immediate--interactive-research-lab).

### Interpretation & analysis
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
- **Reports** — printable, citation-backed HTML/PDF dossier of the full chart.

### Platform
- **Email/password auth** via Supabase, with per-user profiles and preferences.
- **Chart library** — save, open, share, and delete charts.
- **Public share pages** — share a chart read-only via a secret share token.
- **Admin panel** — user management, API-key storage, LLM provider/model
  configuration, and usage stats, gated behind an `admin` role.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript + Tailwind + shadcn/ui)        │
│  • Pages: Dashboard, NewChart, ChartDetail, Dashas, Yogas,   │
│    Doshas, Ashtakavarga, Transits, Compatibility, Debate,    │
│    Remedies, Report, Library, Settings, Admin/*              │
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
│      - render-report     → HTML/PDF report                   │
└──────────────────────────────────────────────────────────────┘
```

The frontend never talks to an external astrology API directly. Chart math is
done server-side in `calculate-kundli`; LLM calls are proxied through
`guru-debate` so API keys stay on the server.

---

## Tech stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React 18, Vite 5, TypeScript 5 |
| Styling / UI | Tailwind CSS 3, shadcn/ui (Radix primitives), Framer Motion, Lucide icons |
| State / data | Zustand, TanStack Query, React Hook Form + Zod |
| Charts       | Recharts, custom SVG Kundli renderers |
| Backend      | Supabase (Postgres, Auth, Storage, Edge Functions on Deno) |
| AI           | OpenAI-compatible chat completions (default Google Gemini `gemini-2.5-flash`), streamed via SSE |
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
| [dashas.ts](supabase/functions/calculate-kundli/dashas.ts) | Vimshottari Dasha to five levels |
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
modular, ~17-section context builder — today's date, **server-computed live
transits** (houses from both Lagna and Moon), the **authoritative Sade Sati
phase**, natal planet table, house lordships, multi-level dashas, yogas/doshas,
Ashtakavarga, Shadbala, Panchang, divisional summaries, and the **KP** and
**Jaimini** sections. A grounding guardrail forbids inventing positions or
dates and tells gurus to state computed values (e.g. the Sade Sati phase)
verbatim. This fixed a class of bugs where gurus would hallucinate
contradictory planetary positions on transit-sensitive questions.

Readings stream over SSE so the UI fills in live and runs the gurus in parallel;
the client captures `finish_reason` and **retries truncated readings** up to
twice. The LLM endpoint, model, and API key are read from `app_settings`
(configurable in the Admin panel) with a `GOOGLE_AI_KEY` environment fallback.

---

## Project structure

```
src/
  pages/
    app/           # Authenticated app: Dashboard, NewChart, ChartDetail,
                   #   Dashas, Doshas, Yogas, Ashtakavarga, Transits, Strengths,
                   #   KP, Jaimini, Varshphal, Muhurta, Compatibility, Debate,
                   #   Remedies, Report, Library, Settings
    admin/         # AdminDashboard, AdminUsers, AdminApiKeys, AdminLlmConfig
    Index.tsx      # Marketing landing page
  components/
    kundli/        # KundliChart (N/S Indian SVG), KundliBiWheel (transit overlay)
    layout/        # AppLayout, AdminLayout, SiteFooter
    auth/          # RequireAuth, RequireAdmin route guards
    ui/            # shadcn/ui primitives
  lib/astro/       # Provider abstraction (factory, types, providers/, normalizers)
  hooks/           # useKundli, useSession, useAdmin, ...
  stores/          # useChartStore, useDebateStore, useUserStore (Zustand)
  integrations/    # Supabase client + generated types
supabase/
  functions/
    calculate-kundli/  # Vedic engine (astronomy, vedic, divisional, dashas,
                       #   yogas, doshas, ashtakavarga, panchang, kp, jaimini)
    guru-debate/       # LLM tribunal: index.ts + dossier.ts (chart dossier builder)
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
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Used by `guru-debate` to read LLM config from `app_settings` |

---

## Database & Edge Functions

Core tables (see [supabase/migrations/](supabase/migrations/)):

- **`profiles`** — one per user, holds display name and chart preferences
  (ayanamsa, chart style, house system) and a `role` (`user` | `admin`).
  Auto-created on signup via the `handle_new_user` trigger.
- **`charts`** — saved charts: `birth_details` (JSONB), cached `snapshot`
  (JSONB, version-stamped — stale snapshots auto-recalculate on load), and a
  secret `share_token` for public read access.
- **`app_settings`** — admin-managed key/value config (LLM endpoint, model, API
  key references), admin-only via RLS.

Row-Level Security restricts every row to its owner; public sharing is served
through the security-definer RPC `get_chart_by_share_token`. Admin views use the
`admin_get_users` and `admin_get_stats` RPCs.

Deploy the schema and functions with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy calculate-kundli
supabase functions deploy guru-debate
supabase functions deploy render-report
supabase secrets set GOOGLE_AI_KEY=<your-key>
```

> **First admin user:** set `role = 'admin'` on your profile row in the Supabase
> SQL editor: `update public.profiles set role = 'admin' where user_id = '<your-uuid>';`

---

## Deployment

Two paths are supported out of the box:

- **Docker** — multi-stage build (`node:20-alpine` → `nginx:alpine`). See
  [Dockerfile](Dockerfile) and [nginx.conf](nginx.conf):
  ```bash
  docker build -t jyotish-sage .
  docker run -p 8080:80 jyotish-sage
  ```
- **DigitalOcean App Platform** — static-site spec in [.do/app.yaml](.do/app.yaml),
  with `deploy_on_push` from `main`.

The Supabase backend (database + edge functions) is deployed separately via the
Supabase CLI as shown above.

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

See [ROADMAP.md](ROADMAP.md) for planned work, including the **Interactive
Research Lab**, specialized kundli types (Prashna, Twins, Business, Mundane), a
**pan-India multi-language launch**, billing/subscriptions, and additional dasha
systems.

---

## Acknowledgements

Interpretations draw on classical source texts: *Brihat Parashara Hora Shastra*,
*Saravali*, *Phaladeepika*, the *Jaimini Sutras*, *Brihat Jataka*, and modern KP
literature. Astronomical algorithms follow Meeus, *Astronomical Algorithms*.

*सत्यमेव जयते*
