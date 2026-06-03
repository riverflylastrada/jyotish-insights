# Devin Task 04 — Muhurta extensions

**Repo:** `jyotish-insights` — Vedic astrology platform (React + Vite + TS;
Supabase + Deno edge functions). Read [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Goal
Extend the electional-astrology (Muhurta) feature with **Abhijit Muhurta**, an
**activity-specific auspicious-date finder** (Tithi + Nakshatra + Vara scoring),
and **Vivah (marriage) Muhurta** rules. Deterministic; no LLM.

## Context / current state
- Core Muhurta ships: `src/pages/app/Muhurta.tsx` (Choghadiya, Hora, Rahu Kaal,
  Gulika Kaal) backed by `supabase/functions/calculate-kundli/panchang.ts` and
  the engine's sunrise/sunset (`astronomy.ts`).
- `src/pages/Panchang.tsx` is the related public daily-panchang page (EN/HI
  bilingual labels, location switcher) — match its conventions.
- The engine entry is `calculate-kundli/engine.ts`; panchang elements
  (Tithi/Vara/Nakshatra/Yoga/Karana) come from `panchang.ts`.

## Scope
1. **Abhijit Muhurta** — the ~48-minute window around solar noon (the 8th of 15
   equal daytime muhurtas), including the **Wednesday exception** (Abhijit is not
   auspicious on Wednesday). Add it to the Muhurta day view alongside the
   existing windows, with a citation.
2. **Auspicious-date finder** — given an **activity type**, a **date range**, and
   a **location**, score each day from its Tithi / Nakshatra / Vara (plus
   Choghadiya quality and Rahu-Kaal/Gulika avoidance) and return ranked good days.
   Each result must cite which rule(s) made the day favorable/unfavorable. Add a
   simple UI (date-range + activity preset + location) reusing existing inputs.
3. **Vivah Muhurta** — marriage-specific rules: favorable Tithis and Nakshatras,
   avoidances (e.g. Bhadra/Vishti karana, Rahu Kaal, specific inauspicious
   Nakshatras), surfaced as an **activity preset** in the finder. Where natural,
   link from Business Kundli (launch timing) to the generic finder.

## Out of scope
- Full Panchanga-shuddhi for every life-event category — start with **marriage +
  one generic preset**; the framework should make adding presets easy later.
- Billing/plan gating.
- Per-individual muhurta matched to a natal chart (this is date-finding by
  panchang, not chart-specific electional yet) — note it as a follow-up.

## Acceptance criteria
- Abhijit window and finder results validated against a reference **panchang
  source** (Drik Panchang / AstroSage) for a known date + place — embed the
  reference in a test (frontend `vitest` or a Deno test if the logic is in the
  edge engine; prefer putting reusable computation server-side in the engine).
- `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, `npm run build`, and
  `deno test`/`deno check` all pass.
- Deterministic output (same inputs → same dates); **bilingual EN/HI labels**
  consistent with `Muhurta.tsx` / `Panchang.tsx`.
- Additive — no `CURRENT_SNAPSHOT_VERSION` impact (this is day/panchang logic,
  not natal `KundliData`).

## Notes
- Put the scoring rules in a single data-driven table (activity → favorable/avoid
  Tithi/Nakshatra/Vara/Karana sets) so new presets are config, not code.
