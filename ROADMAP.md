# Roadmap — Acharya Jyotish

This document tracks the direction of the project. It is grounded in the current
state of the codebase: what already works, what is stubbed, and where the
highest-leverage improvements are. Dates are intentionally omitted; items are
grouped by horizon and theme.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ planned · 💡 idea

---

## Vision

**Acharya Jyotish is an Interactive Astrology Research Lab** — not a prediction
engine. Every chart teaches itself. Every claim shows its math. Every rule cites
its classical source. The user doesn't consume predictions; they verify
mathematical proofs and arrive at understanding themselves.

> ज्योतिष एक गणित है — अंधविश्वास नहीं।
> "Astrology is mathematics — not superstition."

Two modes serve two needs:
- **Research Lab** (default) — interactive, self-directed exploration with
  arrows, color-coded connections, and three depth layers (Visual → Explain →
  Math Proof). No AI needed; all deterministic rules + classical citations.
- **Guru Consultation** — the existing 5-Guru debate engine for synthesized
  guidance and wisdom.

---

## Where we are today

The platform delivers a **Swiss-Ephemeris-grade** engine: 19 divisional charts
(including D-81 / D-108 / D-144 high-divisional vargas), 12 dasha systems
(Vimshottari + Yogini + Ashtottari + Kalachakra + Jaimini Chara + Narayana +
Lagna Kendradi + Sudasa + Drigdasa + Shoola + Dwisaptati-sama + Shat-trimsa-sama
— the last two conditional), a
**153-yoga catalog** (with cancellation rules, including the 32 Nabhasa yogas
and a full Raja/Dhana/Aristha/Daridra/Sanyasa breakdown), doshas, Ashtakavarga, Panchang,
**six-source Shadbala** (+ Ishta/Kashta phala, Vimsopaka & Vargeeya bala),
**Bhava Bala**, **KP (with Placidus cuspal sub-lords)**, full **Jaimini** (Chara
Karakas, Karakamsa, Arudha, Special Lagnas, Chara Dasha), **Varshphal** (annual
chart, Muntha, Year Lord, Tajik yogas), **Muhurta** (Choghadiya/Hora/Rahu Kaal),
**selectable house systems** (Placidus/Koch/Sripati/Equal), **exact Lahiri
ayanamsa**, transits, 36-point compatibility, the multi-Guru debate engine, a
**Voice AI Guru** (live ElevenLabs conversation grounded on the same dossier),
auth, a chart library with public sharing, an admin panel, and PDF report
export. Every calculation is JHora-validated by a **parity harness** + **CI** on
each PR.

**Engine vs. UI:** the **core engine is feature-complete**, and the **initial UI
surfacing phase has shipped** — Strengths, KP, Jaimini, and Varshphal pages, plus
a multi-system Dashas page (Vimshottari / Yogini / Ashtottari / Chara /
Kalachakra). The **Interactive Research Lab is feature-complete** — all five
phases shipped (Interactive D1, Unknown Birth Time, interactive Yogas + Doshas
with structured conditions/cancellations, Interactive Dasha + Divisional,
Interactive Ashtakavarga + Shadbala + KP + Transits, 108-entry classical
planet-in-house templates, and pre-computed Guru snapshots cached per chart) —
plus all four **Specialized Kundli types** (Prashna, Twins, Business, public
Mundane). Next focus: **monetization** (Razorpay billing + plan gating).
Product gap: monetization.

---

## Recently shipped ✅

- ✅ **Lal Kitab house-based remedies** ([lalKitab.ts](src/lib/astro/lalKitab.ts),
  [LalKitab.tsx](src/pages/app/LalKitab.tsx), route `/app/chart/:id/lal-kitab`,
  reached from ChartDetail → Output) — a dedicated, chart-driven Lal Kitab page.
  For each of the 9 grahas in the house it occupies in D1, a **108-cell** static
  map gives the Lal Kitab effect, the traditional totka (the book's house-specific
  "Remedial Measures"), an optional caution, and a per-cell citation pinned to
  **chapter + house**. Every cell sourced from *Lal Kitab — Pt. Radhakrishna
  Shrimali* (Diamond Pocket Books, 2013); the few cross-referenced "treat
  Saturn/Jupiter" remedies were expanded to concrete actions. Pure frontend,
  deterministic — **zero LLM, no snapshot bump**. (PRs #118, #119.) Next layers
  tracked under [Mid-term → Lal Kitab — depth](#lal-kitab--depth).
- ✅ **Three JHora chakras — Saturn Transits, Sarvatobhadra, Kalachakra Chakra.**
  Mined from Jagannatha Hora and validated against it.
  **Saturn Transits** ([saturn_transits.ts](supabase/functions/calculate-kundli/saturn_transits.ts),
  [SaturnTransits.tsx](src/pages/app/SaturnTransits.tsx)) — all Sade Sati cycles
  (past/active/future) computed two ways (sign-based 12/1/2 from Moon **and**
  degree-based ±45°), plus Kantaka (4th/10th) and Ashtama (8th) Shani from both
  Moon and Ascendant; cited BPHS Ch. 65 / Saravali Ch. 35. **Sarvatobhadra
  Chakra** ([sarvatobhadra.ts](supabase/functions/calculate-kundli/sarvatobhadra.ts))
  — the 9×9 nakshatra/rashi/akshara grid with Tara groups, the 11 JHora vedha
  types (from Moon & Lagna), and transit Vedha. **Kalachakra Chakra** (directional)
  ([kalachakra_direction.ts](supabase/functions/calculate-kundli/kalachakra_direction.ts))
  — planets placed in 8 directions (Indra→Isana) by nakshatra. Snapshot version
  bumped to 22.
  > **Hard-won engineering notes (so we don't repeat them):** (1) the Saturn
  > lifetime ephemeris scan first ran ~14.5s and hit the Supabase Edge Function
  > `WORKER_RESOURCE_LIMIT`, breaking chart computation in prod — fixed to ~250ms
  > via per-day memoization + a coarse-scan/binary-search boundary finder
  > ([PR #96]). **Engine work must stay well under the edge CPU limit — no
  > per-day loops over years.** (2) Parity tests must assert against **real
  > PyJHora 4.8.6** values, not the engine's own output (an earlier draft did the
  > latter and shipped wrong nakshatra mappings). **PyJHora is now installed as a
  > local parity oracle**, and every new engine PR is **edge-gated** (deployed to
  > a throwaway test function to confirm no resource-limit) before merge.
- ✅ **Progressive Web App (installable mobile app).** Acharya Jyotish now
  installs to the home screen and runs full-screen offline. Built on
  [vite-plugin-pwa](vite.config.ts) (Workbox `generateSW`, `registerType:
  prompt` → a Sonner reload toast in [src/pwa.ts](src/pwa.ts)) with a web
  manifest + maskable icons. **Offline chart viewing**: the React Query cache
  persists to IndexedDB ([src/lib/queryClient.ts](src/lib/queryClient.ts),
  `PersistQueryClientProvider`) so already-opened saved charts survive reload
  with no network — dehydrating only owned-chart snapshots, `buster`-tied to
  `CURRENT_SNAPSHOT_VERSION`, `gcTime` raised to outlive `maxAge`, purged on
  sign-out/account-switch. Supabase auth + edge POSTs stay network-only.
  **Mobile UX**: a bottom tab bar ([MobileTabBar.tsx](src/components/layout/MobileTabBar.tsx)),
  safe-area insets, an offline banner, and an install affordance (Android
  `beforeinstallprompt` + iOS Add-to-Home-Screen hint) in Settings. Additive —
  no engine change, no snapshot bump. (See Long-term → Mobile / PWA.)
- ✅ **Voice AI Guru.** Talk to an AI Jyotishi live (Hindi-first) over
  **ElevenLabs Conversational AI**. Two edge functions:
  [voice-session](supabase/functions/voice-session/index.ts) mints a WebRTC
  conversation token and builds the per-session `conversation_config_override`
  (persona prompt + shared [grounding](supabase/functions/guru-debate/grounding.ts)
  + the same `buildChartDossier` used by the text debate + voice), `log-session`
  → `voice_sessions`, and a soft `get-usage` cap;
  [voice-tools](supabase/functions/voice-tools/index.ts) is the agent's
  shared-secret-gated tool webhook (`compute_kundli`, `get_current_dasha`,
  `check_transits`, `detect_yogas`, `get_panchang`; compatibility stubbed). **One
  base agent, many personas** — voice/prompt/greeting/language switch per session
  ([personas.ts](supabase/functions/voice-session/personas.ts), 8 personas,
  Phase 1 active: Parashara Muni, Devi Saraswati, KP Master). Frontend uses
  `@elevenlabs/react` ([useVoiceSession.ts](src/hooks/useVoiceSession.ts),
  [VoiceGuru.tsx](src/components/voice/VoiceGuru.tsx)) with a global call tray;
  entry points on ChartDetail (chart-loaded flow), Dashboard (no-chart → asks +
  computes via tools), the Debate page, and nav. Admin → Voice configures the
  agent id / per-Guru voice ids / TTS tuning live (no redeploy);
  `admin_get_voice_stats` powers session analytics. Keys live in `app_settings`
  (Admin → API Keys). Migration:
  [20260531_voice_sessions.sql](supabase/migrations/20260531_voice_sessions.sql).
  Additive — no engine change, no snapshot bump.
  > **Operational steps to enable in prod:** set `ELEVENLABS_API_KEY` +
  > `ELEVENLABS_WEBHOOK_SECRET` (Admin → API Keys), the agent id + voice ids
  > (Admin → Voice), and **enable the agent's Security → Overrides** (System
  > prompt, First message, Language, Voice + tuning) or the SDK rejects them.
- ✅ **Grounded Guru Debate.** Replaced the lossy chart context with a modular
  ~26-section **chart dossier** ([dossier.ts](supabase/functions/guru-debate/dossier.ts)):
  server-computed live transits (houses from Lagna and Moon), authoritative Sade
  Sati phase, multi-level dashas, gender, yogas/doshas, Ashtakavarga, Shadbala,
  divisional summaries, KP and Jaimini sections.
- ✅ **Anti-hallucination guardrail** — gurus must reason only from provided
  data and state computed values (e.g. the Sade Sati phase) verbatim. Fixed the
  bug where gurus placed the same planet in different signs on the same day.
- ✅ **Truncation retry** — the client captures `finish_reason` and retries
  short/cut-off readings up to twice instead of showing them as complete.
- ✅ **KP sub-lord engine** ([kp.ts](supabase/functions/calculate-kundli/kp.ts)) —
  planet sub-lords (sign/star/sub) and Ruling Planets.
- ✅ **Jaimini engine** ([jaimini.ts](supabase/functions/calculate-kundli/jaimini.ts)) —
  8 Chara Karakas (Rahu reversed), Karakamsa, Arudha Padas (AL/UL with exception
  handling), surfaced as first-class chart data.
- ✅ **Self-updating snapshots** — saved charts are version-stamped and
  auto-recalculate when the engine gains new data (no manual "Recalculate").
- ✅ **Swiss-Ephemeris-grade positions** — VSOP87 planets + ELP-2000/82 Moon,
  IAU nutation, true/mean node; matches Swiss Ephemeris to the arc-minute
  (replaced the Keplerian ~0.5° engine).
- ✅ **KP Placidus cuspal sub-lords** + Ruling Planets (sub-arcminute cusp parity).
- ✅ **Jaimini Chara Dasha** (KN Rao method, dual lords).
- ✅ **Six-source Shadbala** ([shadbala.ts](supabase/functions/calculate-kundli/shadbala.ts)) —
  Sthana/Dig/Kala/Cheshta/Naisargika/Drik in Rupas, **validated against
  Jagannatha Hora to ±0.03 Rupa** across 3 reference charts.
- ✅ **Parity harness + CI** — [parity_test.ts](supabase/functions/calculate-kundli/parity_test.ts)
  diffs positions vs Swiss Ephemeris and Shadbala vs JHora;
  [CI](.github/workflows/ci.yml) runs all suites per PR.
- ✅ **CONTRIBUTING.md + repo auto-mirror** — codified conventions
  (parity-over-plausibility, version bumps) and a workflow that mirrors `main`
  to the fork.
- ✅ **PDF report export** — `render-report` renders the dossier to a multi-page
  PDF via PDFShift (key configured in Admin → API Keys).
- ✅ **Bhava Bala** ([bhavabala.ts](supabase/functions/calculate-kundli/bhavabala.ts)) —
  house strength (Bhavadhipathi + Dig + Drishti) in Rupas, JHora-validated.
- ✅ **Yogini + Ashtottari dashas** ([yogini.ts](supabase/functions/calculate-kundli/yogini.ts),
  [ashtottari.ts](supabase/functions/calculate-kundli/ashtottari.ts)) — Maha + Antar, JHora-validated.
- ✅ **Varshphal (Tajik annual chart)** ([varshphal.ts](supabase/functions/calculate-kundli/varshphal.ts)) —
  solar return, Muntha, Year Lord (full Panchavargeeya-Bala tie-break), JHora-validated.
- ✅ **Tajik yogas** ([tajik_yogas.ts](supabase/functions/calculate-kundli/tajik_yogas.ts)) —
  Ithasala, Eesarpha, Ishkavala, Induvara, Nakta, Yamaya on the annual chart, JHora-validated.
- ✅ **KP 4-fold house significators** ([kp.ts](supabase/functions/calculate-kundli/kp.ts)) —
  occupants / occupants' star-lords / owner / owner's star-lords per house, with
  Rahu/Ketu node agency. (Rule-validated; **completes the KP system**.)
- ✅ **Chara Dasha antardasha** ([jaimini.ts](supabase/functions/calculate-kundli/jaimini.ts)) —
  KN Rao sub-periods on the existing Maha-level dasha. Along the way the Maha
  rule was corrected to match JHora (Savya/Apasavya direction + stronger-co-lord
  durations for dual-lord signs); GJC & Rajiv now match PyJHora exactly.
- ✅ **Jaimini extras** ([special_lagna.ts](supabase/functions/calculate-kundli/special_lagna.ts)) —
  Special Lagnas (Bhava/Hora/Ghati/Vighati/Pranapada/Sree, all ≤0.06°) and
  Argala / Virodha Argala. **Completes the Jaimini system.**
- ✅ **Vargeeya Bala** ([vargeeya_bala.ts](supabase/functions/calculate-kundli/vargeeya_bala.ts)) —
  Pancha-vargeeya (±0.1) and Dwadasa-vargeeya (exact) divisional strength.
- ✅ **Kalachakra dasha** ([kalachakra.ts](supabase/functions/calculate-kundli/kalachakra.ts)) —
  nakshatra-pada Savya/Apasavya sequence, PyJHora-validated.
- ✅ **Full Shadbala extras** — Ishta/Kashta phala + Vimsopaka bala
  ([vimsopaka.ts](supabase/functions/calculate-kundli/vimsopaka.ts)), completing
  the strength suite.
- ✅ **Exact Lahiri ayanamsa** — calibrated to Swiss Ephemeris (closes the prior
  ~0.007° systematic delta).
- ✅ **Selectable house systems** — Placidus / Koch / Sripati / Equal alongside
  the Whole Sign default (`profiles.house_system`, exposed in Settings).
- ✅ **Expanded yoga catalog → 44 yogas** ([yogas.ts](supabase/functions/calculate-kundli/yogas.ts)) —
  with cancellation / negation rules.
- ✅ **Muhurta (electional)** ([Muhurta.tsx](src/pages/app/Muhurta.tsx)) —
  Choghadiya, Hora, Rahu Kaal, Gulika Kaal, and related timing windows.
- ✅ **Initial UI surfacing phase** — dedicated **Strengths** (Shadbala + Bhava
  Bala + Vargeeya Bala), **KP**, **Jaimini**, and **Varshphal** pages, plus a
  multi-system **Dashas** page (Vimshottari / Yogini / Ashtottari / Chara /
  Kalachakra). All wired into the ChartDetail module grid. (See UI/UX phase.)
- ✅ **Unknown Birth Time / chart basis** ([engine.ts](supabase/functions/calculate-kundli/engine.ts),
  [kp_horary.ts](supabase/functions/calculate-kundli/kp_horary.ts)) — `ChartBasis`
  of Rasi / **Solar** (Sun-as-Lagna) / **Moon** (Moon-as-Lagna) / **KP Horary**
  on the New Chart form, with the full **KP 1–249** sub-lord table.
- ✅ **Research Lab — Phase 1: Interactive D1 chart** — tappable planets with
  lordship/aspect/conjunction arrows ([ResearchLab.tsx](src/pages/app/ResearchLab.tsx),
  route `/app/chart/:id/lab`).
- ✅ **Research Lab — Phase 2: interactive Yogas** — step-by-step condition cards.
- ✅ **Research Lab — Phase 2: interactive Doshas** ([Doshas.tsx](src/pages/app/Doshas.tsx)) —
  filterable, expandable condition cards with classical-source citations,
  three-state status (active / present·cancelled / not present), and the
  anti-fear banner. Frontend-only; engine extension for true ✓/✗-per-rule
  + cancellation-arrow checklists is a planned follow-up.
- ✅ **Prashna (horary) kundli** ([Prashna.tsx](src/pages/app/Prashna.tsx),
  route `/app/prashna`) — "This moment" + KP horary number (1–249) casting,
  KP-driven 8-guru debate with a backward-compatible `prashnaMode` in
  [guru-debate](supabase/functions/guru-debate/index.ts).
- ✅ **Twins kundli comparison** ([TwinsNew.tsx](src/pages/app/TwinsNew.tsx),
  [TwinsCompare.tsx](src/pages/app/TwinsCompare.tsx), `/app/twins/new` and
  `/app/twins/:idA/:idB`) — D-60 side-by-side, KP cuspal sub-lord delta,
  parallel Vimshottari timeline, Pranapada/Special Lagna comparison.
- ✅ **Business kundli** ([BusinessNew.tsx](src/pages/app/BusinessNew.tsx),
  `/app/business/new`) — founding chart with business-context house labels
  (1=entity, 2=revenue, 7=clients, 10=reputation, 11=profits); ungated via
  a `usePlanGate('business')` stub pending billing.
- ✅ **Mundane astrology page** ([Mundane.tsx](src/pages/Mundane.tsx),
  [mundane.ts](src/lib/astro/mundane.ts), public route `/mundane`) — national
  presets (India 15-Aug-1947), solar ingress, eclipse, and custom event charts
  with mundane house significations (Choudhry/K.N. Rao/B.V. Raman). Public
  (no auth); reuses the validated engine via the provider.
- ✅ **Research Lab — Phase 3a: Interactive Dasha**
  ([DashaFocusPanel.tsx](src/components/dashas/DashaFocusPanel.tsx),
  [dashaUtils.ts](src/lib/astro/dashaUtils.ts)) — every Maha/Antar/Pratyantar row
  is tappable; sticky focus panel highlights the dasha lord on a mini-D1 with
  lordship/aspect arrows; rows colour-coded by functional benefic/malefic (PVR
  Narasimha Rao); Visual / Explain / **Math Proof** depth toggle with Vimshottari
  balance cited to BPHS Ch. 46. Works across all five systems (sign-based Chara /
  Kalachakra resolve to sign lord).
- ✅ **Research Lab — Phase 3b: Interactive Divisional Charts**
  ([InteractiveVargaView.tsx](src/components/research/InteractiveVargaView.tsx),
  [VargaExplorer.tsx](src/pages/app/VargaExplorer.tsx), route
  `/app/chart/:id/charts/:varga`) — each varga tile opens a focused interactive
  view (tappable planets, lordship/aspect/conjunction arrows, depth layers,
  division formula on Math Proof cited to BPHS Ch. 7); cross-chart navigation
  via `?planet=` URL param (planet selection preserved across vargas). The Phase
  1 Interactive D1 was refactored to share this same component so the interaction
  model can't drift.
- ✅ **Research Lab — Phase 4a: Interactive Ashtakavarga + Shadbala**
  ([Ashtakavarga.tsx](src/pages/app/Ashtakavarga.tsx),
  [Strengths.tsx](src/pages/app/Strengths.tsx)) — tappable house/column cells
  in Ashtakavarga show a 7-planet contribution focus panel (BPHS Ch. 48 +
  Sarvachintamani Ch. 6 cited); the Shadbala flat table becomes stacked
  horizontal bars with tappable segments showing each bala's formula
  (BPHS Ch. 27), Virupas/Rupas, and required vs ratio. Engine extensions
  (per-bindu attribution; sub-bala breakdown) are documented as follow-ups.
- ✅ **Research Lab — Phase 4b: Interactive KP + Transits**
  ([Kp.tsx](src/pages/app/Kp.tsx), [Transits.tsx](src/pages/app/Transits.tsx)) —
  tappable KP sub-lord chain (sign-lord → star-lord → sub-lord), 4-fold
  significator derivation panel with Rahu/Ketu's `nodesActingFor` agency, KP
  citations to Krishnamurti KP Reader I–VI; transit focus panel shows the
  natal house, Bhinnashtakavarga bindu count, and aspect arrows to natal
  planets (reusing `aspectOffsets`/`ASPECT_LABEL` from `dashaUtils.ts` — no
  duplication of Vedic aspect logic).
- ✅ **Engine extension — Shadbala sub-bala breakdown**
  ([shadbala.ts](supabase/functions/calculate-kundli/shadbala.ts)) — per-planet
  `subBalas` exposes the internal sub-components for each of the six source balas
  (Sthana → Uchcha + Saptavargeeya + Ojhayugma + Kendra + Drekkana; Kala →
  Nathonnatha + Paksha + Tribhaga + Varsha/Masa/Vara/Hora/Ayana + Yuddha; etc.),
  each in Virupas with BPHS Ch. 27 citations. Additive schema; top-level balas,
  total, ratio, and rank byte-identical on reference charts; JHora parity still
  ±0.03 Rupa. (PR #56.)
- ✅ **Engine extension — Ashtakavarga per-bindu attribution**
  ([ashtakavarga.ts](supabase/functions/calculate-kundli/ashtakavarga.ts)) —
  optional `attribution` field surfaces, for each (planet, house) cell, the set
  of contributing positions that generated each bindu, each cited to its BPHS
  Ch. 48 rule. Aggregate `bhinna` + `sarva` totals byte-identical pre/post on
  reference charts. (PR #57.)
- ✅ **Engine extension — Doshas structured conditions & cancellations**
  ([doshas.ts](supabase/functions/calculate-kundli/doshas.ts),
  [doshas_test.ts](supabase/functions/calculate-kundli/doshas_test.ts)) — each
  Dosha now exposes optional `conditions[]` and `cancellations[]` with rule,
  isMet, evidence, and classical citation. Each detector refactored to build
  conditions first and derive `isPresent`/`severity` from them — verdict
  byte-identical to the pre-refactor output. Doshas page renders a true
  ✓/✗-per-rule checklist with arrows from cancelling rows to the condition they
  cancel. (PR #58.) Snapshot version bumped to 17.
- ✅ **Research Lab — Phase 5a: 108 D1 planet-in-house templates**
  ([planetInHouse.ts](src/lib/astro/planetInHouse.ts)) — exactly 9 × 12
  classical interpretation entries (brief + full + citation + keywords) drawn
  from BPHS Ch. 24 with Saravali / Phaladeepika fallbacks for the nodes.
  Surfaced on the Research Lab Explain depth layer when a planet is selected
  on D1. Pure frontend; zero LLM cost; deterministic.
- ✅ **Research Lab — Phase 5b: Pre-computed Guru snapshots**
  ([guru-debate/index.ts](supabase/functions/guru-debate/index.ts),
  [validate_auto_insights.ts](supabase/functions/guru-debate/validate_auto_insights.ts)) —
  new `auto-insights` mode generates per-planet / per-dasha / per-yoga /
  per-dosha / per-house mini-readings in a single LLM call at chart creation
  and caches them in the snapshot. Surfaced on tap in ResearchLab / Yogas /
  Doshas / Dashas / ChartDetail. Feature flag `app_settings.auto_insights_enabled`;
  failure non-fatal; server-side JSON schema validation; `calculateKundli`
  becomes async to await the LLM call. (PR #61.) Snapshot version bumped to 18.
- ✅ **Daily Panchang public page** ([Panchang.tsx](src/pages/Panchang.tsx),
  public route `/panchang`) — today's Tithi / Vara / Nakshatra / Yoga / Karana
  / sunrise–sunset plus Muhurta strips (Choghadiya, planetary Hora, Rahu Kaal,
  Gulika Kaal, Yamaghanda); date picker, location switcher, EN + HI bilingual
  labels, WhatsApp share, SEO meta. No auth; reuses the validated engine via
  the provider (same anon-invoke pattern as Mundane). Linked from the landing
  page. (PR #63.)
- ✅ **Avasthas — planetary states** ([avasthas.ts](supabase/functions/calculate-kundli/avasthas.ts),
  [avasthas_test.ts](supabase/functions/calculate-kundli/avasthas_test.ts)) —
  Baladi (5 age states with odd-/even-sign order), Jagradadi (3 awake / dream /
  sleep states by dignity), and Deeptadi (9 states from dignity + retrogression
  + conjunction + combustion), all cited to BPHS Ch. 45 (śl. 3–4 / 10–15 /
  16–25). Each `PlanetPos.avasthas?` field is optional and additive. Surfaced
  as a new "Avasthas — Planetary States" section on the Strengths page with
  per-planet badges + tooltips. Skip Rahu/Ketu (nodes aren't sign-degree
  positioned). (PR #64.) Snapshot version bumped to 19.
- ✅ **High-divisional vargas — D-81, D-108, D-144**
  ([divisional.ts](supabase/functions/calculate-kundli/divisional.ts),
  [vargaData.ts](src/components/research/vargaData.ts)) — Nava-Navamsa,
  Ashtottaramsa, and Dwadas-Dwadasamsa cited to BPHS Ch. 7 + Sanjay Rath's
  "Vargas" treatise. Each gets a tile on DivisionalCharts with the existing
  🔬 interactive explorer (depth layers, division formula on Math Proof).
  Total now 19 vargas (was 16). (PR #66.)
- ✅ **Three Jaimini rasi dashas — Narayana, Lagna Kendradi, Sudasa**
  ([narayana.ts](supabase/functions/calculate-kundli/narayana.ts),
  [lagna_kendradi.ts](supabase/functions/calculate-kundli/lagna_kendradi.ts),
  [sudasa.ts](supabase/functions/calculate-kundli/sudasa.ts) + tests) —
  Narayana (Padakrama, zodiacal for odd / anti-zodiacal for even, cited to
  Sanjay Rath + Jaimini Sutra 2.3), Lagna Kendradi (strength-ordered with
  kendra → panaphara → apoklima per KN Rao), and Sudasa (wealth dasha from
  D-2 Hora chart, Jaimini Sutra Pada 4). Each appears as a new tab on the
  multi-system Dashas page with bilingual labels (नारायण / लग्न केन्द्रादि /
  सुदशा). The Interactive Dasha focus panel from #50 already handles
  sign-based dashas — no refactor needed. Total now 8 dasha systems.
  (PR #67.) Snapshot version bumped to 20.
- ✅ **Four more dasha systems — Drigdasa, Shoola, Dwisaptati-sama,
  Shat-trimsa-sama**
  ([drigdasa.ts](supabase/functions/calculate-kundli/drigdasa.ts),
  [shoola.ts](supabase/functions/calculate-kundli/shoola.ts),
  [dwisaptati.ts](supabase/functions/calculate-kundli/dwisaptati.ts),
  [shat_trimsa.ts](supabase/functions/calculate-kundli/shat_trimsa.ts) +
  tests) — Drigdasa (aspect-based rasi dasha from Atmakaraka, Jaimini Sutra
  Pada 4 / Sanjay Rath); Shoola (longevity timing rasi dasha, Phaladeepika
  Ch. 8 / KN Rao); and the two **conditional Vimshottari variants** cited to
  BPHS Ch. 47 — Dwisaptati-sama (72-year, fires when Lagna lord is in the
  7th or 7th lord in Lagna) and Shat-trimsa-sama (36-year, fires when Sun
  is in Lagna or Sun is Atmakaraka in a kendra). Conditional dashas return
  null when their applicability rule doesn't fire, and their Dashas-page
  tabs include a tooltip explaining the condition. **Total now 12 dasha
  systems.** (PR #70.) Snapshot version bumped to 21.
- ✅ **Yoga catalog expanded 44 → 153**
  ([yogas.ts](supabase/functions/calculate-kundli/yogas.ts)) — meets the
  150+ target. Adds the **32 Nabhasa yogas** (BPHS Ch. 36 — Ashraya, Dala,
  Akriti, Sankhya groups), a fuller Raja-yoga catalog with Rajabhanga
  cancellations, expanded Dhana yogas, and new **Aristha / Daridra /
  Sanyasa** categories. Each new yoga cites its BPHS / Saravali /
  Phaladeepika / Brihat Jataka source inline. 213 source citations added.
  Yogas.tsx CATEGORY_LABELS extended for the three new categories. Existing
  44 yogas' tests still pass on reference charts. (PR #71.) Snapshot
  version bumped to 21.
- ✅ **Transit alerts + in-app notification center**
  ([transit_events.ts](supabase/functions/calculate-kundli/transit_events.ts),
  [transit-scan/index.ts](supabase/functions/transit-scan/index.ts),
  [Notifications.tsx](src/pages/app/Notifications.tsx)) — pure-function
  detector covers seven event categories with classical citations: Sade Sati
  phase transitions (Saravali Ch. 35), Ashtama Shani, sign ingresses of
  Saturn / Jupiter / Rahu / Ketu, Guru Bala (Phaladeepika Ch. 26), major
  retrograde stations, eclipse activations within ±10° of natal positions,
  and Vimshottari Maha/Antar transitions. Daily-scheduled `transit-scan`
  edge function iterates over consenting users' charts, upserts events
  into a new `transit_alerts` table with a `(chart_id, event_key)` dedup
  constraint and per-user RLS. Notification bell in the AppLayout header
  shows unread count; `/app/notifications` lists events grouped by chart
  with severity colouring, filters, mark-as-read, and deep-links into the
  relevant chart sub-page. Settings page gains a master toggle +
  per-category checkboxes. Gated behind `usePlanGate('transit_alerts')`
  stub (returns true). Additive throughout — no engine changes, no
  snapshot version bump. Email + browser-push delivery queued as v2 / v3.
  (PR #75.)
  > **Operational steps to enable in prod** (one-time after deploy):
  > apply the migration, run `supabase functions deploy transit-scan`,
  > then schedule the daily job via `cron.schedule(...)` in the Supabase
  > SQL editor (recipe documented in `supabase/config.toml`).

> All engine work above is validated against **Jagannatha Hora (PyJHora)** and
> surfaced both in the Guru Debate dossier and in dedicated UI. The **core
> engine is feature-complete**, the **initial UI surfacing phase has shipped**,
> and the **Interactive Research Lab is now feature-complete** — all five phases
> shipped (Interactive D1, Unknown Birth Time, interactive Yogas + Doshas with
> structured conditions/cancellations, Interactive Dasha + Divisional,
> Interactive Ashtakavarga + Shadbala + KP + Transits, 108 classical
> planet-in-house templates, and pre-computed Guru snapshots per chart), plus
> all four **Specialized Kundli types** (Prashna, Twins, Business, Mundane).
> Next focus: **monetization** (Razorpay billing + plan gating).

---

## Near-term

### Optional engine additions (the core engine is otherwise complete)
- ✅ **More dasha systems** — Drigdasa, Shoola, Dwisaptati-sama, and
  Shat-trimsa-sama all ship (12 systems total including Vimshottari, Yogini,
  Ashtottari, Kalachakra, Jaimini Chara, Narayana, Lagna Kendradi, and Sudasa).
  The two conditional systems appear only when their applicability fires.

### Engine accuracy polish
- ✅ **Avasthas** — Baladi, Jagradadi, Deeptadi planetary states (BPHS Ch. 45)
  shipped in [avasthas.ts](supabase/functions/calculate-kundli/avasthas.ts) +
  Strengths page section.

### Quality & testing
- ✅ **PyJHora parity oracle.** `pip install PyJHora` (the Python port of
  Jagannatha Hora, v4.8.6 — the same engine the parity tests cite) is set up
  locally as the **authoritative reference**. New engine features assert against
  *PyJHora's actual output* for a reference chart (not the engine's own output —
  the failure mode that shipped wrong Sarvatobhadra/Kalachakra mappings in a
  first draft). Devin specs now instruct "validate against PyJHora".
- ✅ **Edge-deploy gate.** Because CI auto-deploys edge functions on merge to
  `main`, every engine PR is first deployed to a throwaway `calculate-kundli-test`
  function and confirmed free of `WORKER_RESOURCE_LIMIT` **before merge** — added
  after the Saturn lifetime scan broke prod chart computation once.
- 🟡 **Engine unit coverage.** KP, Jaimini, Shadbala, the dossier, and a
  Swiss-Eph/JHora parity harness are covered; extend to vedic, divisional,
  dashas, yogas, doshas, ashtakavarga, panchang with golden-snapshot tests.

### Provider layer
- 🟡 **Finish the provider abstraction.** `normalizers.ts` is a no-op and the
  `vedicrishi` provider is a stub. `custom` is confirmed working against the
  edge function; remove dead paths or complete the VedicRishi adapter.

---

## Immediate — Interactive Research Lab

> **Principle:** Build the interactive system first. Every feature added
> afterward is born interactive from day one. The Research Lab is the product
> identity — not a feature.

> **Status:** All five phases have shipped — Interactive D1, Unknown Birth
> Time, interactive Yogas + Doshas (with structured conditions/cancellations),
> Interactive Dasha + Divisional, Interactive Ashtakavarga + Shadbala + KP +
> Transits, and the Phase 5 template insight database + pre-computed Guru
> snapshots (see Recently shipped). **The Research Lab is feature-complete.**
> Next focus: **monetization** (Razorpay billing + plan gating) and the small
> remaining engine items (more dasha systems, the 150+ yoga target, expanded
> vargas).

### Design principles
1. **Show the Rule, Not Just the Result** — every statement traces to a
   classical rule, tappable to reveal it.
2. **Show the Math, Not Just the Label** — Shadbala doesn't just say "Strong";
   it shows each sub-component formula and computation.
3. **Show the Source, Not Just the Claim** — every interpretation cites BPHS
   chapter/shloka or equivalent classical reference.
4. **Arrows Show Cause → Effect** — lordship (gold solid), aspects (blue
   dashed), conjunction (purple glow), exchange (bidirectional gold).
5. **Every Element Is a Door** — nothing on screen is static; every planet,
   house, yoga name, dasha period, number is tappable into deeper layers.

### Three depth layers (user-controlled)
- **👁️ Visual** — arrows, color-coded houses, dignity glows. No tap needed.
- **👆 Explain** — plain-language explanation panel with bilingual terms.
- **🔬 Math Proof** — step-by-step formula, classical citation, verifiable
  computation.

### Phase 1: Core interaction system
- ✅ **Interactive D1 chart** — tappable planets with animated arrows:
  gold solid → lordship, blue dashed → aspects, purple glow → conjunctions.
  Color-coded house highlights (placed / owned / aspected). Labels appear on
  each house ("📍 HERE", "👑 OWNS", "🏹 ASPECTS"). Three depth layers
  togglable. Lordship proof shows formula:
  `House = ((SignNumber - AscSign + 12) mod 12) + 1`. "🔮 Ask 5 Gurus" bridge
  button to Guru Debate with pre-filled context.
- ✅ **Unknown Birth Time option** on New Chart form — Solar Chart (Sun as
  Lagna), Moon Chart (Moon as Lagna), KP Horary Number (1–249). Stops losing
  ~30–40% of users who don't know their birth time.

### Phase 2: Yogas & Doshas as interactive condition checklists
- ✅ **Interactive Yogas** — each yoga presented as a step-by-step condition
  checklist (✓/✗ per step). User walks through and proves/disproves each yoga
  themselves. Cancellation rules equally prominent. Classical source cited per
  yoga (BPHS chapter, Phaladeepika shloka, etc.).
- ✅ **Interactive Doshas** — full ✓/✗-per-rule checklist with cancellation
  arrows now ships (engine extension landed in #58). Filterable cards,
  three-state status, classical-source citations, anti-fear banner — and each
  condition / cancellation is its own row tied to BPHS / Phaladeepika.

### Phase 3: Dasha & Divisional chart interaction ✅
- ✅ **Interactive Dasha timeline** — tap any period → mini-D1 highlights the
  dasha lord's placement, ownership, and aspects; rows colour-coded by
  functional benefic/malefic; Vimshottari balance on the Math Proof layer.
- ✅ **Interactive Divisional Charts** — each varga has a focused explorer with
  tappable planets, lordship/aspect arrows, depth layers, and division formula
  on Math Proof. Cross-chart navigation preserves the selected planet via
  `?planet=` URL param. Shares the same component as Interactive D1.

### Phase 4: Advanced research tools ✅
- ✅ **Interactive Ashtakavarga** — tappable house/column cells; 7-planet
  contribution focus panel; BPHS Ch. 48 + Sarvachintamani Ch. 6 cited.
- ✅ **Interactive Shadbala** — stacked horizontal bars; tap any segment to see
  that bala's formula, Virupas/Rupas, and required vs ratio. BPHS Ch. 27 cited.
- ✅ **Interactive KP** — tappable sub-lord chain (sign → star → sub); 4-fold
  significator derivation with Rahu/Ketu agency; Krishnamurti KP Reader cited.
- ✅ **Interactive Transits** — tap a transit planet → natal house +
  Bhinnashtakavarga bindu + aspect arrows to natal planets (reuses
  `aspectOffsets` from `dashaUtils.ts`).
- ✅ **Engine-extension follow-ups** — all three landed (snapshot version
  bumped to 17): per-bindu attribution for Ashtakavarga with BPHS Ch. 48
  citations (#57), sub-bala breakdown for Shadbala with per-sub-component
  Virupas (#56), and structured `conditions[]` / `cancellations[]` for Doshas
  (#58). All preserve parity — aggregate bindu totals, top-level bala values,
  and dosha verdicts are byte-identical to pre-refactor output on the
  reference charts.

### Phase 5: Template insight database ✅
- ✅ **108 planet-in-house interpretations** for D1 — full 9 × 12 table drawn
  from BPHS Ch. 24 (with Saravali / Phaladeepika fallbacks for the nodes), each
  entry with brief + full text + classical citation + thematic keywords; surfaced
  on the Research Lab's Explain depth layer when a planet is tapped. Deterministic;
  no LLM cost.
- ✅ **Pre-computed Guru snapshots** — `auto-insights` mode in the guru-debate
  edge function: ONE LLM call at chart creation generates the structured
  mini-readings (per planet, per current+upcoming dashas, per detected yoga and
  dosha, per house) and caches them in the snapshot. Surfaced on tap in
  ResearchLab / Yogas / Doshas / Dashas / ChartDetail. Feature-flagged via
  `app_settings.auto_insights_enabled`; failure non-fatal (chart still saves
  without insights). Server-side JSON validation; cached forever until the
  engine snapshot version bumps.

---

## Near-term — Specialized Kundli types ✅

> All four types shipped. Each reuses the existing engine with different input
> forms and interpretation contexts. See Recently shipped for routes/files.

- ✅ **Prashna Kundli (प्रश्न कुंडली)** — "This moment" + KP horary number
  (1–249); KP-driven 8-guru debate with `prashnaMode`. Route: `/app/prashna`.
- ✅ **Twins Kundli (जुड़वा कुंडली)** — D-60 side-by-side, KP cuspal sub-lord
  delta, parallel Vimshottari, Pranapada/Special Lagna comparison.
  Routes: `/app/twins/new`, `/app/twins/:idA/:idB`.
- ✅ **Business Kundli (व्यापार कुंडली)** — founding chart with reinterpreted
  business houses; ungated via `usePlanGate('business')` stub pending billing.
  Route: `/app/business/new`.
- ✅ **Mundane Kundli (मुण्डेन कुंडली)** — national presets (India 15-Aug-1947),
  solar ingress, eclipse, custom event charts with mundane house labels
  (Choudhry / K.N. Rao / B.V. Raman). **Public** route `/mundane` (no auth).

---

## UI/UX phase — surface the engine in the app ✅

**Shipped.** Every engine output below now has a dedicated front-end view (it was
previously computed and used only by the Guru Debate). The next UI focus is the
**Interactive Research Lab** above, which makes these views explorable rather
than read-only.

| Engine feature | Front-end work |
|----------------|----------------|
| Shadbala | ✅ Strengths page — six balas + total Rupas + rank |
| Bhava Bala | ✅ Strengths page — house-strength view alongside Shadbala |
| Vargeeya Bala | ✅ Strengths page — Pancha/Dwadasa divisional strength |
| Yogini + Ashtottari dashas | ✅ Multi-system **Dashas** page (system tabs) |
| Varshphal (annual chart) | ✅ **Varshphal** page — annual wheel, Muntha, Year Lord |
| Tajik yogas | ✅ Shown within the Varshphal view |
| KP (sub-lords, cuspal sub-lords, Ruling Planets, significators) | ✅ **KP** page |
| Jaimini (Chara Karakas, Karakamsa, Arudha, Chara Dasha, Special Lagnas) | ✅ **Jaimini** page |
| Navigation / IA | ✅ New pages surfaced in the ChartDetail module grid |

Cross-cutting UI/UX (ongoing, folds into the Research Lab): responsive/mobile
polish, accessibility pass, loading/empty/error states, and visual consistency.

---

## Mid-term

### From PyJHora — next features to mine
> PyJHora 4.8.6 (the Python port of Jagannatha Hora) is now installed as the
> local **parity oracle**. The chakras above came from it; these are the next
> gaps, prioritised by value. Spec + Devin prompts:
> [jhora-features-batch2-spec.md](docs/jhora-features-batch2-spec.md). Each is
> validated against PyJHora and edge-gated before deploy.
- ✅ **Sudarshana Chakra** — tri-wheel overlaying D1 from Lagna + Moon + Sun
  ([SudarshanaChakra.tsx](src/pages/app/SudarshanaChakra.tsx)); a house is
  "confirmed" when strong from all three. PyJHora-validated. Shipped at v23.
- ✅ **South-Indian compatibility · 10 Porutham** — Dina/Gana/Mahendra/
  Stree-Dheerga/Yoni/Rasi/Rajju/Vedha/Vasya/Nadi, as a tab on the Compatibility
  page alongside the North-Indian 36-point Ashta Koota. Shipped at v23.
- ✅ **Sahams (36 sensitive points)** — Tajik/Varshphal sensitive points (Punya,
  Vidya, Yasas, …) on the Varshphal page. PyJHora parity to 0.001°. Shipped at v23.
- ⬜ **Batch 3 (depth)** — spec + Devin prompts in
  [jhora-features-batch3-spec.md](docs/jhora-features-batch3-spec.md): more
  **divisional charts (D-5/6/8/11)** → reaches the 23+-varga target; an
  **eclipse** computation + public SEO page; and the **Tripataki Chakra**.
- 💡 Further PyJHora gaps: Graha Yuddha (planetary war, no clean PyJHora oracle),
  more chakras (Shoola-chakra, Kaala), a Festival/Vratha calendar (SEO
  top-of-funnel like Panchang), and the highest divisional charts (D-150, D-300).

### Additional classical systems
- ✅ **More dasha systems** (target: 12+) — 12 systems now ship: Vimshottari,
  Yogini, Ashtottari, Kalachakra, Jaimini Chara, Narayana, Lagna Kendradi,
  Sudasa, Drigdasa, Shoola, plus the conditional Dwisaptati-sama (72-year,
  applies when Lagna lord ↔ 7th interchange) and Shat-trimsa-sama (36-year,
  applies when Sun is in Lagna or AK-in-kendra). The two conditional systems
  return null for charts where the rule doesn't fire.
- ✅ **Expanded yoga catalog** (target: 150+) — **153 yogas** now ship,
  organised by category: Raja, Dhana, Pancha Mahapurusha, the **32 Nabhasa
  yogas** (Ashraya, Dala, Akriti, Sankhya groups — BPHS Ch. 36), Chandra,
  Surya, **Aristha**, **Daridra**, **Sanyasa**, and Other — with cancellation
  / Rajabhanga rules and per-yoga BPHS / Saravali / Phaladeepika citations.
  Each renders as an interactive condition card on the Yogas page.
- 🟡 **Divisional chart expansion** (target: 23+ vargas) — D-81 (Nava-Navamsa),
  D-108 (Ashtottaramsa), and D-144 (Dwadas-Dwadasamsa) already ship (19 total);
  still planned: D-2 / D-3 / D-4 / D-8 scheme variants (Parashari, Kashinatha,
  Parivrittitraya, Somanatha, Krishnamurthy schemes).

### Lal Kitab — depth
> v1 = the planet-in-house totke page (see Recently shipped). The Shrimali
> edition fully documents several more Lal Kitab systems; these are the
> prioritised next layers — all static / deterministic (no LLM), each a small,
> reviewable data + page PR on top of the v1 baseline.
- ⬜ **Manglik-dosh remedy table** — the book's explicit *Ascendant × Mars-house*
  grid → numbered trials (e.g. Aries + Mars-in-7 → trials 9 & 18). Self-contained
  and the **strongest next addition**; pairs with the existing Mangal Dosha detector.
- ⬜ **Rin / ancestral-debt detection** — Pitra-rin, Matra-rin, Stri-rin, plus
  Kin's and Nature's debt, each with the book's planet-combination trigger,
  symptom, and family-level remedy. Larger build: needs a detector over the D1
  placements, not just a per-cell lookup.
- ⬜ **Lal Kitab planet conditions** — blind / asleep / dormant / dharmi and
  "sleeping-house" modifiers that decide whether a remedy actually applies; would
  refine each cell's `nature` and add "remedy works / does not work" flags.
- 💡 **Daywise & Varshphal totke** — the book's day-of-week remedy chapter and
  the year-based (varshphalam) trials. Lower priority.
- 💡 **Astrologer review pass** — the per-cell `nature` (Challenging / Mixed /
  Supportive) is the one interpretive (non-verbatim) field; worth a domain
  expert's eye against known charts.

### Features
- ⬜ **Muhurta extensions** — core Muhurta (Choghadiya/Hora/Rahu Kaal/Gulika)
  already ships; add Abhijit Muhurta, an activity-specific auspicious date finder
  (Tithi+Nakshatra+Vara combos), and Vivah Muhurta (marriage rules). Connects to
  Business Kundli for launch timing.
- ✅ **Transit alerts & notifications.** Shipped — daily-scheduled
  `transit-scan` edge function detects upcoming Sade Sati phase transitions,
  Ashtama Shani, Saturn/Jupiter/Rahu/Ketu sign ingresses, Guru Bala,
  major retrograde stations, eclipse activations within ±10° of natal
  positions, and Vimshottari dasha transitions. Surfaced via a notification
  bell + `/app/notifications` page + Settings toggles. Email and browser
  push delivery are queued as v2 / v3.
- 🟡 **Voice AI Guru follow-ups** — core feature ships (see Recently shipped).
  Remaining: activate **Phase 2–3 personas** (Jaimini, Varahamihira, Mantreshwar,
  Bhrigu, Lal Kitab) once voices are sourced; register the **6 tools** in the
  agent for the no-chart Dashboard flow; a real **gun-milan engine** to replace
  the `check_compatibility` stub; an ElevenLabs **post-call webhook** to populate
  `credits_consumed` + authoritative transcript; and an optional **server-side
  conversation-initiation webhook** so the dossier never reaches the browser.
- 💡 **RAG-backed citations** for the Guru debate — ground readings in the
  actual source texts (BPHS, Saravali, Phaladeepika) for verifiable quotes.
- 💡 **Birth Time Rectification** — user provides 3–5 major life events;
  engine tests multiple Lagna positions and finds the one where dasha periods
  align with actual events.

### Monetization & accounts
- ⬜ **Billing integration** — Razorpay (India market) + webhook handler +
  `subscriptions` table. Pricing: Free ₹0 / Pro ₹499 / Acharya ₹1,999/month.
- ⬜ **Plan gating** with `usePlanGate(feature)` hook:
  | Gate              | Free          | Pro        | Acharya       |
  |-------------------|---------------|------------|---------------|
  | Saved charts      | 1             | Unlimited  | Unlimited     |
  | Vargas visible    | D1 + D9       | All        | All           |
  | Guru Debate       | Locked        | Full       | Full + custom |
  | PDF export        | Locked        | Full       | Full          |
  | Business Kundli   | —             | —          | Full          |
  | Transit alerts    | —             | —          | Full          |
- ⬜ **Usage metering** for LLM debate calls per user, surfaced in admin
  dashboard.

---

## Long-term

- ⬜ **Pan-India language launch** (14 languages, 97% population coverage):
  - **Phase 1:** Hindi, Marathi (Devanagari — font loaded), Tamil, Telugu,
    Bengali — 75% of India.
  - **Phase 2:** Gujarati, Kannada, Malayalam, Odia, Punjabi — 88%.
  - **Phase 3:** Assamese, Urdu (requires RTL support) — 95%.
  - **Phase 4:** Nepali, Konkani (Devanagari) — 97%.
  - Architecture: `react-i18next` + namespace-separated locale files
    (`common.json`, `astro.json`, `readings.json`, `landing.json`).
    Language-prefixed URLs (`/hi/app/chart/123`). Dynamic font loading per
    script (Noto Sans family via Google Fonts).
  - Astrology term translations MUST be reviewed by a Jyotish domain expert
    per language (not generic AI translation). Budget: ₹5K–15K per language.
  - Guru Debate: add `"Respond in ${userLanguage}"` to guru system prompts.
  - Community correction loop: "Suggest better translation" button.
- ✅ **Daily Panchang page** (`/panchang`) — public, no auth, language-aware.
  Today's Tithi, Vara, Nakshatra, Yoga, Karana, Choghadiya, Rahu Kaal. "Share
  on WhatsApp" button. `panchang.ts` already computes all data. "आज का पंचांग"
  = millions of monthly searches — top-of-funnel growth engine.
- ✅ **Mobile / PWA** — installable, offline-capable chart viewing. Shipped via
  [vite-plugin-pwa](vite.config.ts) (Workbox `generateSW`, `registerType: prompt`
  with a Sonner "new version" reload toast in [src/pwa.ts](src/pwa.ts)), a web
  manifest + maskable icons generated from [icon-source.svg](public/icon-source.svg)
  by [pwa-assets.config.ts](pwa-assets.config.ts), and Apple/standalone meta in
  [index.html](index.html). **Offline chart viewing**: the React Query cache is
  persisted to IndexedDB via `PersistQueryClientProvider`
  ([src/lib/queryClient.ts](src/lib/queryClient.ts)) — only owned-chart snapshots
  are dehydrated, the `buster` is tied to `CURRENT_SNAPSHOT_VERSION`, `gcTime`
  is raised to 7 days to outlive `maxAge`, and the cache is purged on
  sign-out / account-switch. Supabase auth + edge-function POSTs stay
  network-only (no `*.supabase.co` runtime cache). **Mobile UX**: a bottom tab
  bar ([MobileTabBar.tsx](src/components/layout/MobileTabBar.tsx)) under `md`,
  safe-area insets, an offline banner, and an install affordance
  (`beforeinstallprompt` on Android + an iOS "Add to Home Screen" hint) in
  Settings. nginx serves `sw.js` / `index.html` / manifest `no-cache`.
- ⬜ **Collaboration / consultations** — let a professional astrologer annotate
  and share reports with clients.
- 💡 **Public API** — expose the calculation engine as a documented API for
  third-party developers.
- 💡 **Chart comparison & synastry** beyond Ashta Koota — composite charts and
  full relationship transits.
- 💡 **Diaspora targeting** — once Tamil, Telugu, Gujarati, Punjabi ship, serve
  Indian communities in US, UK, Canada, UAE, Singapore, Australia (willing to
  pay in USD/GBP).
- 💡 **Alibaba Cloud AI Catalyst Program** — apply under SocialCoffee Digitech
  for up to $120K cloud credits + 2B Model Studio tokens for GPU inference, RAG
  pipeline, vector search infrastructure.

---

## Cross-cutting / hygiene

- ⬜ **Accessibility pass** (keyboard nav, ARIA, contrast) across all pages.
- ⬜ **Performance** — profile and lazy-load heavy routes; extend the
  version-stamped snapshot cache in `useKundli`.
- ⬜ **Security review** of RLS policies and the public share-token path.
- ⬜ **Observability** — structured logging and error tracking for edge
  functions.
- 🟡 **Documentation** — CONTRIBUTING.md ships; still want engine math notes and
  an ADR log.

---

## Recommended build order

| #  | Item                                     | Effort   | Unlocks                           |
|----|------------------------------------------|----------|-----------------------------------|
| 1  | ✅ Unknown Birth Time (form option)      | 2–3 days | Stops losing 30–40% of users      |
| 2  | ✅ Interactive D1 Chart (arrows + depths)| 5–6 days | Research Lab identity              |
| 3  | ✅ Interactive Yogas (condition checklists)| 3–4 days | Most shareable feature           |
| 4  | ✅ Interactive Doshas (condition cards)  | 3–4 days | Destroys fear-based astrology      |
| 5  | ✅ Interactive Dasha (tap → chart highlight) | 3–4 days | Core Research Lab complete       |
| 6  | ✅ Interactive Divisionals (cross-chart nav) | 4–5 days | 16 vargas become explorable      |
| 7  | ✅ Interactive Ashtakavarga/Shadbala/KP/Transits | 5–6 days | Advanced research tools complete |
| 8  | Razorpay billing + plan gating ⬅ next    | 2–3 wks  | Revenue starts                     |
| 9  | Hindi + Marathi + Tamil + Telugu + Bengali| 3–4 wks  | 75% of India covered               |
| 10 | ✅ Daily Panchang page + WhatsApp share  | 3–4 days | Top-of-funnel growth engine        |
| 11 | ✅ Narayana + Lagna Kendradi + Sudasa Dasha | 1–2 wks  | 8 dasha systems, pro credibility |
| 12 | ✅ Prashna Kundli (born interactive)     | 4–5 days | Daily engagement, zero barrier     |
| 13 | ✅ Twins Kundli (D-60 comparison)        | 5–6 days | Press-worthy, unique in market     |
| 14 | 5 more languages (Phase 2)               | 2–3 wks  | 88% of India covered               |
| 15 | ✅ Business Kundli                       | 4–5 days | Acharya tier monetization          |
| 16 | ✅ Mundane Kundli (public page)          | 5–6 days | SEO + thought leadership           |
| 17 | ✅ Voice AI Guru (ElevenLabs ConvAI)     | ~1 wk    | Flagship — talk to a Guru live     |
| 18 | ✅ PWA + mobile pass                     | 2–3 wks  | Mobile-first India market          |
| 19 | RAG pipeline + classical text corpus     | 3–4 wks  | Verifiable shloka citations        |
| 20 | Remaining languages (Phase 3–4)          | 2–3 wks  | 97% of India covered               |

---

## How to contribute to the roadmap

Open an issue describing the system, calculation, or feature, and reference the
relevant module (e.g. `supabase/functions/calculate-kundli/dashas.ts`). For
engine work, include a reference calculation (AstroSage / Jagannatha Hora) so we
can validate parity.
