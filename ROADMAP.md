# Roadmap — Jyotish Sage

This document tracks the direction of the project. It is grounded in the current
state of the codebase: what already works, what is stubbed, and where the
highest-leverage improvements are. Dates are intentionally omitted; items are
grouped by horizon and theme.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ planned · 💡 idea

---

## Where we are today

The platform delivers an end-to-end experience: in-house chart computation, 16
divisional charts, Vimshottari dasha, yogas, doshas, Ashtakavarga, Panchang,
transits, 36-point compatibility, the multi-Guru debate engine, auth, a chart
library with public sharing, an admin panel, and PDF report export.

The remaining gaps are **astronomical precision** (ephemeris, full Shadbala),
**a few stubbed classical systems** (Chara Dasha, KP Placidus cusps),
**monetization/plan enforcement**, and a **parity test harness**.

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
- ✅ **Edge-function tests** — 45 Deno tests across the KP, Jaimini, and dossier
  modules; Vitest covers the SSE parse + retry logic.
- ✅ **PDF report export** — `render-report` renders the dossier to a multi-page
  PDF via PDFShift (key configured in Admin → API Keys).

---

## Near-term

### Engine accuracy & correctness
- ⬜ **Swiss Ephemeris / VSOP87 upgrade.** The engine currently uses Keplerian
  orbital elements (Meeus) with ~0.1–0.5° accuracy. Move to a higher-precision
  ephemeris so positions, the ascendant, and house cusps match professional
  software (AstroSage, Jagannatha Hora) to the arc-minute.
- ⬜ **True vs. mean lunar nodes.** Make Rahu/Ketu computation explicitly
  selectable (true node by default).
- 🟡 **AstroSage parity test harness.** A celebrity dataset
  (`indian_celebrity_kundli_data.xlsx`) exists — wire it into an automated
  parity suite that diffs computed charts against known-good references and
  fails CI on regressions. (KP/Jaimini unit tests exist; full chart parity does
  not yet.)
- ⬜ **Full Shadbala.** Replace the current simplified strength heuristic with
  the classical six-source Shadbala (Sthana, Dig, Kala, Cheshta, Naisargika,
  Drik) reported in Rupas/Virupas.

### Finish the stubbed systems
- 🟡 **Jaimini Chara Dasha.** `computeCharaDasha` is stubbed pending parity
  validation. Implement the KN Rao method and validate against AstroSage/JHora
  before un-stubbing the dossier section.
- 🟡 **KP cuspal sub-lords.** `computePlacidusCusps` is stubbed; KP currently
  uses Whole Sign. Implement Placidus cusps, then cuspal sub-lords and the
  4-fold significator scheme.

### Quality & testing
- 🟡 **Engine unit coverage.** KP, Jaimini, and the dossier are covered; extend
  to astronomy, vedic, divisional, dashas, yogas, doshas, ashtakavarga, panchang
  plus golden-snapshot tests for full charts.
- ⬜ **CI pipeline** — run lint + Vitest + `deno test`/`deno check` on every push/PR.

### Provider layer
- 🟡 **Finish the provider abstraction.** `normalizers.ts` is a no-op and the
  `vedicrishi` provider is a stub. `custom` is confirmed working against the
  edge function; remove dead paths or complete the VedicRishi adapter.

---

## Mid-term

### Additional classical systems
- ⬜ **More dasha systems** — Yogini, Ashtottari, Kalachakra (alongside the
  in-progress Jaimini Chara Dasha).
- ⬜ **Multiple house systems.** Only Whole Sign is implemented, though
  `profiles.house_system` already stores the preference. Add Placidus, Sripati,
  Equal, and KP (Placidus-based) cusps. *(Shares the Placidus work above.)*
- ⬜ **Expanded yoga catalog** — grow well beyond the current 15+, organized by
  category with cancellation rules.
- ⬜ **Extend the Jaimini toolkit** — Argala, Chara Dasha sub-periods, and Special
  Lagnas, building on the shipped Chara Karakas / Arudha Padas.

### Features
- 🟡 **Muhurta (electional astrology).** A route exists; build out
  auspicious-timing selection (Panchang-driven, with Choghadiya/Hora).
- ⬜ **Transit alerts & notifications.** Promised by the "Acharya" pricing tier;
  detect significant gochara/Sade Sati events and notify users.
- ⬜ **Annual chart (Varshphal / Tajik).** Solar-return chart and year analysis.
- 💡 **RAG-backed citations** for the Guru debate — ground readings in the
  actual source texts (BPHS, Saravali, Phaladeepika) for verifiable quotes.

### Monetization & accounts
- ⬜ **Billing integration.** Pricing tiers (Free / Pro / Acharya) are shown on
  the landing page but not enforced. Integrate a payment provider
  (Razorpay/Stripe) and a `subscriptions` table.
- ⬜ **Plan gating** — enforce limits (saved charts, vargas, debate access,
  exports) per tier.
- ⬜ **Usage metering** for LLM debate calls, surfaced in the admin dashboard.

---

## Long-term

- ⬜ **Internationalization** — full Hindi UI and Devanagari rendering
  throughout (fonts are already loaded).
- ⬜ **Mobile / PWA** — installable, offline-capable chart viewing.
- ⬜ **Prashna (horary) astrology** — charts cast for the moment of a question.
- ⬜ **Collaboration / consultations** — let a professional astrologer annotate
  and share reports with clients.
- 💡 **Public API** — expose the calculation engine as a documented API for
  third-party developers.
- 💡 **Chart comparison & synastry** beyond Ashta Koota — composite charts and
  full relationship transits.

---

## Cross-cutting / hygiene

- ⬜ **Accessibility pass** (keyboard nav, ARIA, contrast) across all pages.
- ⬜ **Performance** — profile and lazy-load heavy routes; extend the
  version-stamped snapshot cache in `useKundli`.
- ⬜ **Security review** of RLS policies and the public share-token path.
- ⬜ **Observability** — structured logging and error tracking for edge
  functions.
- ⬜ **Documentation** — contributor guide, engine math notes, and an ADR log.

---

## How to contribute to the roadmap

Open an issue describing the system, calculation, or feature, and reference the
relevant module (e.g. `supabase/functions/calculate-kundli/dashas.ts`). For
engine work, include a reference calculation (AstroSage / Jagannatha Hora) so we
can validate parity.
