# Devin task briefs

Self-contained, parity-validatable task briefs for autonomous coding agents
(Devin et al.). Each is grounded in the current codebase and follows the repo's
[CONTRIBUTING.md](../../CONTRIBUTING.md) conventions — **parity over
plausibility**, snapshot-version discipline, and CI-verifiable output.

These are the "best fit for an autonomous agent" slice of [ROADMAP.md](../../ROADMAP.md):
self-contained, testable, and validatable against Jagannatha Hora (PyJHora) /
AstroSage references.

| # | Task | Type | Unlocks |
|---|------|------|---------|
| [01](01-gun-milan-engine.md) | Gun-Milan (Ashtakoota) edge engine | Engine + voice | Real `check_compatibility` voice tool; reusable 36-point matching |
| [02](02-divisional-scheme-variants.md) | Divisional scheme variants (→ 23+ vargas) | Engine | Parashari/Kashinatha/Parivrittitraya/Somanatha/Krishnamurthy D-2/3/4/8 |
| [03](03-engine-test-coverage.md) | Engine golden-snapshot test coverage | Quality | Regression safety for vedic/dashas/yogas/ashtakavarga/panchang |
| [04](04-muhurta-extensions.md) | Muhurta extensions | Feature | Abhijit Muhurta, auspicious-date finder, Vivah Muhurta |

## How to run one
1. Paste a brief into the agent as the task.
2. The agent works on a branch and opens a PR to `main`.
3. CI (`.github/workflows/ci.yml`) runs frontend `tsc`/`vitest`/`build` and
   `deno test`/`deno check`; the brief's acceptance criteria must hold.

## Shared conventions (all tasks)
- **Validate engine output against a reference** (Jagannatha Hora / PyJHora /
  AstroSage) and embed the reference values in a Deno test — never "looks right".
- **Additive schema** by default. If `KundliData`'s shape changes, bump
  `CURRENT_SNAPSHOT_VERSION` in both `supabase/functions/calculate-kundli/engine.ts`
  and `src/lib/astro/types.ts` (see CONTRIBUTING.md).
- Edge functions are **Deno** with inline CORS; tests are `*_test.ts` next to the
  module; the engine entry is `calculate-kundli/engine.ts` (`calculateKundli`,
  `BirthDetails`).
- Bilingual EN/HI labels where user-facing, matching existing pages.
