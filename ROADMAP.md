# Roadmap — Jyotish Sage

This document tracks the direction of the project. It is grounded in the current
state of the codebase: what already works, what is stubbed, and where the
highest-leverage improvements are. Dates are intentionally omitted; items are
grouped by horizon and theme.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ planned · 💡 idea

---

## Vision

**Jyotish Sage is an Interactive Astrology Research Lab** — not a prediction
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

The platform delivers a **Swiss-Ephemeris-grade** engine: 16 divisional charts,
Vimshottari + Yogini + Ashtottari + Kalachakra + Jaimini Chara dashas, a
**44-yoga catalog** (with cancellation rules), doshas, Ashtakavarga, Panchang,
**six-source Shadbala** (+ Ishta/Kashta phala, Vimsopaka & Vargeeya bala),
**Bhava Bala**, **KP (with Placidus cuspal sub-lords)**, full **Jaimini** (Chara
Karakas, Karakamsa, Arudha, Special Lagnas, Chara Dasha), **Varshphal** (annual
chart, Muntha, Year Lord, Tajik yogas), **Muhurta** (Choghadiya/Hora/Rahu Kaal),
**selectable house systems** (Placidus/Koch/Sripati/Equal), **exact Lahiri
ayanamsa**, transits, 36-point compatibility, the multi-Guru debate engine,
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
Product gaps: transit alerts, monetization.

---

## Recently shipped ✅

- ✅ **Grounded Guru Debate.** Replaced the lossy chart context with a modular
  ~17-section **chart dossier** ([dossier.ts](supabase/functions/guru-debate/dossier.ts)):
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
- ⬜ **More dasha systems** — Narayana, Lagna Kendradi, Sudasa and other rasi
  dashas (Vimshottari, Yogini, Ashtottari, Kalachakra, and Jaimini Chara already
  ship); see Mid-term for the full target list.

### Engine accuracy polish
- ⬜ **Avasthas** — Baladi, Jagradadi, Deeptadi planetary states (BPHS Ch.45).

### Quality & testing
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
> remaining engine items (Avasthas, more dasha systems, the 150+ yoga target).

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

### Additional classical systems
- ⬜ **More dasha systems** (target: 12+) — beyond shipped Vimshottari, Jaimini
  Chara, Yogini, Ashtottari, and Kalachakra:
  - Narayana / Padakrama (rasi dasha, Sanjay Rath method)
  - Lagna Kendradi (strength-ordered rasi dasha)
  - Sudasa (wealth-focused from D2)
  - Drigdasa (aspect-based ordering)
  - Shoola (death/health rasi dasha)
  - 💡 Conditional dashas (Dwisaptati-sama, Shat-trimsa-sama — apply only when
    specific birth conditions are met)
- ⬜ **Expanded yoga catalog** (target: 150+) — 44 yogas with cancellation rules
  already ship; grow toward:
  - 32 Nabhasa yogas (Ashraya, Dala, Akriti, Sankhya groups)
  - Raja yoga catalog with Rajabhanga cancellation rules
  - Dhana yogas (wealth) with gradations
  - Aristha yogas (health) with longevity implications
  - Daridra, Sanyasa, Kemadruma yogas + cancellation rules
  - Each yoga presented as interactive condition checklist (Research Lab style)
- ⬜ **Divisional chart expansion** (target: 23+ vargas) — add D-81
  (Nava-Navamsa), D-108 (Ashtottaramsa), D-144 (Dwadas-Dwadasamsa), and
  D-2/D-3/D-4/D-8 variations (Parashari, Kashinatha, Parivrittitraya,
  Somanatha, Krishnamurthy schemes).

### Features
- ⬜ **Muhurta extensions** — core Muhurta (Choghadiya/Hora/Rahu Kaal/Gulika)
  already ships; add Abhijit Muhurta, an activity-specific auspicious date finder
  (Tithi+Nakshatra+Vara combos), and Vivah Muhurta (marriage rules). Connects to
  Business Kundli for launch timing.
- ⬜ **Transit alerts & notifications.** Promised by the "Acharya" pricing tier;
  detect significant gochara/Sade Sati events and notify users.
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
- ⬜ **Daily Panchang page** (`/panchang`) — free, no auth, language-aware.
  Today's Tithi, Vara, Nakshatra, Yoga, Karana, Choghadiya, Rahu Kaal. "Share
  on WhatsApp" button. `panchang.ts` already computes all data. "आज का पंचांग"
  = millions of monthly searches — top-of-funnel growth engine.
- ⬜ **Mobile / PWA** — installable, offline-capable chart viewing.
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
| 10 | Daily Panchang page + WhatsApp share     | 3–4 days | Top-of-funnel growth engine        |
| 11 | Narayana + Lagna Kendradi + Sudasa Dasha | 1–2 wks  | 8+ dasha systems, pro credibility  |
| 12 | ✅ Prashna Kundli (born interactive)     | 4–5 days | Daily engagement, zero barrier     |
| 13 | ✅ Twins Kundli (D-60 comparison)        | 5–6 days | Press-worthy, unique in market     |
| 14 | 5 more languages (Phase 2)               | 2–3 wks  | 88% of India covered               |
| 15 | ✅ Business Kundli                       | 4–5 days | Acharya tier monetization          |
| 16 | ✅ Mundane Kundli (public page)          | 5–6 days | SEO + thought leadership           |
| 17 | PWA + mobile pass                        | 2–3 wks  | Mobile-first India market          |
| 18 | RAG pipeline + classical text corpus     | 3–4 wks  | Verifiable shloka citations        |
| 19 | Remaining languages (Phase 3–4)          | 2–3 wks  | 97% of India covered               |

---

## How to contribute to the roadmap

Open an issue describing the system, calculation, or feature, and reference the
relevant module (e.g. `supabase/functions/calculate-kundli/dashas.ts`). For
engine work, include a reference calculation (AstroSage / Jagannatha Hora) so we
can validate parity.
