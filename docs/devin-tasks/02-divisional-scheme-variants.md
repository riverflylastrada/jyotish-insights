# Devin Task 02 — Divisional charts: scheme variants (→ 23+ vargas)

**Repo:** `jyotish-insights` — Vedic astrology platform (React + Vite + TS;
Supabase + Deno edge functions). Read [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Goal
Add the alternate **calculation schemes** for **D-2, D-3, D-4, D-8** so users can
choose between Parashari (current default) and the Kashinatha /
Parivrittitraya / Somanatha / Krishnamurthy schemes — raising the effective varga
count past 23 — **without changing the default output of any existing chart.**

## Context / current state
- `supabase/functions/calculate-kundli/divisional.ts` computes all 19 vargas with
  **standard Parashari formulas**. See the `case 'D2'` (Hora), `case 'D3'`
  (Drekkana), `case 'D4'`, `case 'D8'` blocks — each cited to BPHS Ch. 7 and
  "validated vs PyJHora 4.8.6".
- `supabase/functions/calculate-kundli/divisional_test.ts` is the test pattern.
- `src/components/research/vargaData.ts` holds the front-end varga metadata;
  `src/pages/app/VargaExplorer.tsx` and `DivisionalCharts.tsx` render the vargas
  (with the interactive explorer + Math-Proof depth layer).
- PyJHora supports multiple varga schemes — use it as the parity reference.

## Scope
1. Add the alternate schemes for **D-2, D-3, D-4, D-8** as selectable variants —
   e.g. a `scheme` parameter on the varga computation, defaulting to `parashari`.
   Each scheme cited to its classical source. The **default path must produce
   byte-identical output to today**.
2. Validate each new scheme against **PyJHora** in `divisional_test.ts`: embed
   reference placements (sign per planet) for at least one reference chart per
   new scheme, citing the PyJHora function used.
3. Surface a **scheme selector** in the varga UI (default = Parashari). Ensure
   the Math-Proof depth layer shows the chosen scheme's division formula.
   Extend `vargaData.ts` as needed.

## Out of scope
- New varga *divisions* beyond D-2/3/4/8 scheme variants (no D-5/D-6/… additions
  here).
- Reworking the interactive explorer component itself.

## Acceptance criteria
- Default (Parashari) output for D-2/3/4/8 is **byte-identical** to current output
  on the reference charts (assert this in the test).
- Each new scheme matches PyJHora on the embedded reference placements.
- `deno test supabase/functions/calculate-kundli/` + `deno check …/engine.ts`
  pass; frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`,
  `npm run build` pass.
- If the `KundliData` shape changes (e.g. vargas now carry a scheme tag), **bump
  `CURRENT_SNAPSHOT_VERSION`** in both `engine.ts` and `src/lib/astro/types.ts`
  per CONTRIBUTING.md. Prefer an additive shape that avoids a bump if possible.

## Notes
- Keep schemes data-driven where possible (a per-scheme mapping table) rather than
  copy-pasting case blocks, so a 5th scheme is easy to add later.
