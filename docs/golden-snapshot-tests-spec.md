# Devin spec — Golden snapshot regression tests for the chart engine

**Goal:** today the engine has parity tests that check a *handful* of fields
(`parity_test.ts` asserts ascendant + planet longitudes vs Swiss Ephemeris) but
**nothing freezes the full `KundliData` output**. A refactor can silently change
yogas, shadbala, ashtakavarga, dashas, divisional placements, etc. without any
test going red. Add a **golden test** that locks the *entire* normalized engine
output for the three reference charts, so any unintended change to any field
fails CI with a readable diff. One PR.

We have **independently verified** the current output of the Dev Chart against
Jagannatha Hora for Ashtakavarga and Vimshottari Dasha (both correct), so
baselining current behavior now is safe — we're freezing known-good values.

## Guardrails (LOVABLE.md / CONTRIBUTING.md) — read first
- Branch off `main`; **ONE PR**; never commit to `main`; **do NOT merge** — the
  maintainer reviews the baseline.
- **Authorized for this feature (the one exception to the "`supabase/functions/**`
  is off-limits" rule):** ADD new **test-only** files under
  `supabase/functions/calculate-kundli/` — a test file, a `__golden__/` baseline
  directory, and a shared helper. ADD one local dev script under `scripts/`.
- **Off-limits:** do NOT modify ANY engine/source `.ts`
  (`engine.ts`, `ashtakavarga.ts`, `astronomy.ts`, … — anything that isn't a
  `*_test.ts`/baseline/helper). This PR must **not change a single computed
  value**. `.github/workflows/**`, `.env`, `.do/app.yaml`,
  `src/integrations/supabase/types.ts` — untouched.
- **Do NOT bump `CURRENT_SNAPSHOT_VERSION`.** It stays at 24
  (`src/lib/astro/types.ts:366` and `engine.ts:339`). This PR adds tests only; if
  you ever feel the urge to bump it, your test is wrong — the engine output must
  be byte-identical to `main`.
- **Permissionless by design.** CI runs `deno test` with **no permission flags**
  (see below). The test must do **zero file/network/env I/O at runtime** — load
  baselines via static `import`, not `Deno.readTextFile`. This is why we use an
  imported baseline module instead of Deno std `assertSnapshot` (which needs
  `--allow-read` and would force a CI-workflow edit).

## Reference facts (verified in the codebase — reuse, don't reinvent)
- **The engine is one pure async function:** `calculateKundli(details: BirthDetails)
  → KundliData`, exported from `supabase/functions/calculate-kundli/engine.ts:97`.
  No HTTP, no I/O — directly callable in a Deno test. (`index.ts:77` just wraps it
  in `Deno.serve`.)
- **Output shape:** `KundliData` interface, `src/lib/astro/types.ts:368-413`
  (`ascendant`, `panchang`, `divisionalCharts`, `dashas`, `doshas`, `yogas`,
  `ashtakavarga`, `shadbala`, `vimsopakaBala`, `bhavaBala`, `kp`, `jaimini`,
  `varshphal`, `vargeeyaBala`, `saturnTransits`, `sarvatobhadra`,
  `kalachakraDirection`, `tripataki`, `sudarshana`, plus volatile `id`,
  `generatedAt`, `snapshotVersion`, optional `autoInsights`, and `raw: unknown`).
- **Non-deterministic / non-engine fields to STRIP before comparing:** `id`
  (random uuid), `generatedAt` (timestamp), `autoInsights` (LLM-populated, not from
  the math engine), `raw` (internal debug blob). Keep `snapshotVersion` (it's the
  constant 24 — freezing it is desirable).
- **Three reference charts already exist** as `BirthDetails` consts (currently
  duplicated in `parity_test.ts:101+` and `doshas_test.ts:20-72`). Exact inputs:
  | label | date | time | place | lat | lng | tzOffset |
  |---|---|---|---|---|---|---|
  | Dev Chart (Dhanu Lagna) | 1983-08-23 | 15:35:00 | Patan, Gujarat | 23.85 | 72.12 | 5.5 |
  | Rajiv Gandhi | 1944-08-20 | 08:11:00 | Mumbai | 19.076 | 72.8777 | 5.5 |
  | Amitabh Bachchan | 1942-10-11 | 16:00:00 | Allahabad | 25.4358 | 81.8463 | 5.5 |
  All use `ayanamsa:"lahiri"`, `houseSystem:"whole_sign"`, `nodeType:"mean"`.
- **CI command (do not change):** `.github/workflows/ci.yml:37` →
  `deno test supabase/functions/calculate-kundli/ supabase/functions/guru-debate/`.
  It globs the directory, so a new `*_test.ts` is picked up automatically.
- **Existing assertion style:** `assertEquals` / `assertAlmostEquals` from
  `https://deno.land/std@0.224.0/assert/mod.ts`. No snapshot infra exists today
  (zero `assertSnapshot`, zero `.snap` files).

---

## Part 1 — Shared helper: fixtures + normalizer
New file `supabase/functions/calculate-kundli/__golden__/_shared.ts`:
- Export the three `BirthDetails` fixtures (`DEV_CHART`, `RAJIV_GANDHI`,
  `AMITABH_BACHCHAN`) — copy the exact values from the table above. (Leaving the
  duplicates in `parity_test.ts`/`doshas_test.ts` is fine; do not touch those
  files in this PR.)
- Export `normalize(k: KundliData): unknown` that returns a deep clone with:
  1. `id`, `generatedAt`, `autoInsights`, `raw` **removed**.
  2. **every number deep-rounded to 6 decimals** (recursively walk objects/arrays)
     — this kills last-ULP float jitter between the CI (Linux) and dev (macOS)
     runtimes so the baseline is portable. Round with
     `Math.round(n * 1e6) / 1e6`; leave non-finite numbers as-is.

## Part 2 — Baseline modules (generated, committed)
One file per chart under `supabase/functions/calculate-kundli/__golden__/`:
`dev.ts`, `rajiv.ts`, `amitabh.ts`, each `export const EXPECTED = { … } as const;`
holding the **normalized** `KundliData` for that chart. These are generated by the
script in Part 4 — do not hand-author them.

## Part 3 — The golden test
New file `supabase/functions/calculate-kundli/engine_golden_test.ts`:
```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import { DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN, normalize } from "./__golden__/_shared.ts";
import { EXPECTED as DEV }     from "./__golden__/dev.ts";
import { EXPECTED as RAJIV }   from "./__golden__/rajiv.ts";
import { EXPECTED as AMITABH } from "./__golden__/amitabh.ts";

for (const [name, fixture, expected] of [
  ["Dev Chart",  DEV_CHART,      DEV],
  ["Rajiv Gandhi", RAJIV_GANDHI, RAJIV],
  ["Amitabh Bachchan", AMITABH_BACHCHAN, AMITABH],
] as const) {
  Deno.test(`Golden: full KundliData — ${name}`, async () => {
    const actual = normalize(await calculateKundli(fixture));
    assertEquals(actual, expected); // deep structural equality → readable diff on drift
  });
}
```
No file/env reads → runs under the existing permissionless CI command.

## Part 4 — Local baseline updater (never runs in CI)
New file `scripts/update-golden.ts`: for each fixture, run `calculateKundli`,
`normalize`, and write `__golden__/<chart>.ts` as
`export const EXPECTED = <pretty-printed JSON> as const;`. Run locally only:
`deno run --allow-write=supabase/functions/calculate-kundli/__golden__ scripts/update-golden.ts`.
Document this command in a comment at the top of the script and in the test file.

**The intended workflow (document it in the script header):** when a *future* PR
*intentionally* changes engine output, the author (a) re-runs this updater to
refresh the baselines, (b) eyeballs the `git diff` to confirm the change is
expected, and (c) bumps `CURRENT_SNAPSHOT_VERSION` in both `types.ts` and
`engine.ts`. The golden test is the machine-checkable companion to that version
bump.

## Verification
- `deno test supabase/functions/calculate-kundli/` — all green, including the 3
  new golden tests.
- **Baseline is faithful, not arbitrary:** after generating, run the updater a
  second time on a clean tree → `git diff __golden__/` is **empty** (output is
  deterministic).
- **It actually catches regressions:** temporarily perturb one benefic place in
  `ashtakavarga.ts` (or any computed value) → the relevant golden test FAILS with
  a diff pinpointing the changed field → revert the perturbation. Note this in the
  PR description.
- `git diff` touches only: the new test, `__golden__/` (helper + 3 baselines), and
  `scripts/update-golden.ts`. **No source `.ts` changed. No version bump.**
- Full CI mirror passes: `deno check supabase/functions/calculate-kundli/engine.ts`
  and `npx vitest run && npm run build && npx tsc --noEmit -p tsconfig.app.json`.

## Deliverable
ONE PR against `main`: `_shared.ts` + 3 baseline modules + `engine_golden_test.ts`
+ `scripts/update-golden.ts`. Test-only — zero engine changes, no
`CURRENT_SNAPSHOT_VERSION` bump. Do **not** merge; the maintainer reviews that the
baseline matches known-good output before it becomes the reference of record.
