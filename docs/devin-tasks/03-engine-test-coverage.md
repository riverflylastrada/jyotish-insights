# Devin Task 03 — Engine golden-snapshot test coverage

**Repo:** `jyotish-insights` — Vedic astrology platform (Deno edge functions +
React). Read [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Goal
Close the engine unit-test gap with **golden-snapshot tests** for the modules
that lack them, so regressions are caught by CI on every PR. This is a
pure-quality task — **no production behavior changes.**

## Context / current state
- Already covered (mirror their style): `parity_test.ts` (Swiss-Eph + JHora
  parity), plus `kp_test.ts`, `jaimini_test.ts`, `divisional_test.ts`,
  `doshas_test.ts`, `avasthas_test.ts`, dasha tests (`narayana_test.ts`,
  `sudasa_test.ts`, `shoola_test.ts`, …), and `guru-debate/dossier_test.ts`.
  All live next to their module as `*_test.ts` and run under
  `deno test supabase/functions/calculate-kundli/`.
- **Still uncovered (the targets):**
  - `vedic.ts` — sidereal conversion, nakshatra/pada, whole-sign houses,
    dignity, combustion.
  - `dashas.ts` — Vimshottari Maha → Antar → Pratyantar boundaries + balance.
  - `yogas.ts` — presence/absence + cancellation of key yogas.
  - `ashtakavarga.ts` — Bhinna + Sarva bindu totals.
  - `panchang.ts` — Tithi, Vara, Nakshatra, Yoga, Karana.

## Scope
1. Add `vedic_test.ts`, `dashas_test.ts`, `yogas_test.ts`,
   `ashtakavarga_test.ts`, and `panchang_test.ts` using Deno's test runner.
2. Each asserts against values from a **reference chart computed in Jagannatha
   Hora / AstroSage** — embed the reference birth details and expected values in
   the test, citing the source in comments. Use at least **two reference charts**
   for the structural outputs (yoga presence, AV bindu totals, dasha boundaries).
3. Keep tests deterministic and fast; reuse `calculateKundli` /the module's
   exported pure functions rather than re-deriving.

## Out of scope
- **Any engine behavior change.** Tests must pass against current output. If a
  test surfaces a genuine bug, **open an issue and leave the test xfail/commented
  with a note** — do NOT "fix" it by loosening the assertion or editing the
  engine in this task.

## Acceptance criteria
- New tests pass under the existing CI `deno test
  supabase/functions/calculate-kundli/` job and locally via the same command.
- Coverage now spans vedic / dashas / yogas / ashtakavarga / panchang.
- **No non-test production files changed.** No `CURRENT_SNAPSHOT_VERSION` bump.
- Reference values are real (JHora/AstroSage), embedded, and cited — not derived
  from the engine itself (that would make the test tautological).

## Notes
- For Vimshottari, assert the Maha-dasha balance at birth and at least one
  Antar/Pratyantar boundary date.
- For Ashtakavarga, assert the per-house Sarva totals (they sum to 337) and a
  couple of Bhinna cells.
