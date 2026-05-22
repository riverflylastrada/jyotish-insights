# Roadmap — Jyotish Sage

This document tracks the direction of the project. It is grounded in the current
state of the codebase: what already works, what is stubbed, and where the
highest-leverage improvements are. Dates are intentionally omitted; items are
grouped by horizon and theme.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ planned · 💡 idea

---

## Where we are today

The platform already delivers an end-to-end experience: in-house chart
computation, 16 divisional charts, Vimshottari dasha, yogas, doshas,
Ashtakavarga, Panchang, transits, 36-point compatibility, the multi-Guru debate
engine, auth, a chart library with public sharing, and an admin panel. The
recent commit history shows active work on AstroSage parity (compatibility
scoring, Ashtakavarga tables) and on the debate engine (parallel streaming,
multi-turn memory).

The main gaps are **astronomical precision**, **breadth of classical systems**,
**monetization/plan enforcement**, and **automated test coverage**.

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
  fails CI on regressions.
- ⬜ **Full Shadbala.** Replace the current simplified strength heuristic with
  the classical six-source Shadbala (Sthana, Dig, Kala, Cheshta, Naisargika,
  Drik) reported in Rupas/Virupas.

### Quality & testing
- 🟡 **Test the calculation engine.** Only a placeholder Vitest exists today.
  Add unit tests per module (astronomy, vedic, divisional, dashas, yogas,
  doshas, ashtakavarga, panchang) plus golden-snapshot tests for full charts.
- ⬜ **CI pipeline** — run lint + tests on every push/PR.
- ⬜ **Edge-function tests** for `calculate-kundli` and `guru-debate`
  (Deno test).

### Provider layer
- 🟡 **Finish the provider abstraction.** `normalizers.ts` is a no-op and the
  `vedicrishi`/`custom` frontend providers are stubs. Confirm `custom` fully
  routes to the `calculate-kundli` edge function and remove dead paths, or
  complete the VedicRishi adapter as a documented fallback.

---

## Mid-term

### Additional classical systems
- ⬜ **More dasha systems** — Yogini, Ashtottari, Kalachakra, and Jaimini
  **Chara Dasha** (the Jaimini guru already reasons about Chara Dasha, but the
  engine doesn't compute it yet).
- ⬜ **Multiple house systems.** Only Whole Sign is implemented, though
  `profiles.house_system` already stores the preference. Add Placidus, Sripati,
  Equal, and KP (Placidus-based) cusps.
- ⬜ **Expanded yoga catalog** — grow well beyond the current 15+, organized by
  category with cancellation rules.
- ⬜ **Jaimini toolkit** — Chara Karakas, Arudha Padas, Karakamsa, Argala,
  surfaced as first-class chart data (not just LLM prose).

### Features
- 🟡 **Muhurta (electional astrology).** A route exists; build out
  auspicious-timing selection (Panchang-driven, with Choghadiya/Hora).
- ⬜ **Transit alerts & notifications.** Promised by the "Acharya" pricing tier;
  detect significant gochara/Sade Sati events and notify users.
- ⬜ **Annual chart (Varshphal / Tajik).** Solar-return chart and year analysis.
- ⬜ **True PDF export.** `render-report` produces HTML; add reliable
  server-side PDF rendering.
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
- ⬜ **Performance** — profile and lazy-load heavy routes; the snapshot cache in
  `useKundli` already helps, extend it.
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
