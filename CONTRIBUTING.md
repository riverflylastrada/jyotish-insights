# Contributing — Jyotish Sage

Conventions for human and **automated** contributors (Devin, Claude Code, …).
Engine prompts can simply say *"follow CONTRIBUTING.md"* instead of repeating these.

## Golden rules for engine changes

1. **Parity over plausibility.** Any change to the calculation engine
   (`supabase/functions/calculate-kundli/`) must be validated against
   [`parity_test.ts`](supabase/functions/calculate-kundli/parity_test.ts) — Swiss
   Ephemeris reference values across 3 reference charts (dev chart 1983 Patan,
   Rajiv Gandhi 1944, Amitabh Bachchan 1942). **If you cannot reach the target
   accuracy, keep the calculation stubbed/partial and say so in the PR.** Never
   loosen a tolerance or fabricate a value just to make a test pass — an honest
   stub beats a confident wrong answer.

2. **Bump the snapshot version when the snapshot shape or values change.**
   Increment `CURRENT_SNAPSHOT_VERSION` in
   [`src/lib/astro/types.ts`](src/lib/astro/types.ts) **and** `snapshotVersion`
   in [`engine.ts`](supabase/functions/calculate-kundli/engine.ts) (keep them
   equal). Saved charts below the current version auto-recalculate via
   [`useKundli`](src/hooks/useKundli.ts).

3. **Never fabricate in the Guru Debate dossier.** If a system isn't computed,
   the dossier must say so. Grounding lives in
   [`dossier.ts`](supabase/functions/guru-debate/dossier.ts) and
   `GROUNDING_INSTRUCTION` in
   [`guru-debate/index.ts`](supabase/functions/guru-debate/index.ts) — gurus must
   reason only from provided data and state computed values (e.g. the Sade Sati
   phase) verbatim.

## Workflow

- One coherent change per PR; branch off `main`. If two open PRs touch the same
  files (`engine.ts` / `dossier.ts` / `types.ts` / `parity_test.ts`), expect to
  rebase the second onto the first.
- **CI must pass** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Run
  locally first:
  ```bash
  deno test supabase/functions/calculate-kundli/ supabase/functions/guru-debate/
  deno check supabase/functions/calculate-kundli/engine.ts supabase/functions/guru-debate/index.ts
  npx vitest run && npm run build && npx tsc --noEmit -p tsconfig.app.json
  ```
- Each PR description: include a **parity table** (engine vs Swiss Ephemeris /
  AstroSage / JHora) for engine work, and list anything left stubbed and why.

## Both GitHub repos

`main` auto-mirrors to `riverflylastrada/jyotish-insights` via
[`.github/workflows/mirror.yml`](.github/workflows/mirror.yml) (requires the
`MIRROR_TOKEN` repo secret). **Do not push to the fork manually.**

## Deploy (after merge — maintainer step)

Edge functions do **not** auto-deploy:
```bash
supabase functions deploy calculate-kundli --project-ref bkdfseyhusoxiruhuhbs
supabase functions deploy guru-debate     --project-ref bkdfseyhusoxiruhuhbs
```
The frontend deploys via DigitalOcean on push to `main`.

## Don't commit

Secrets / API keys. Leave `.agents/`, `indian_celebrity_kundli_data.xlsx`, and
`skills-lock.json` untracked unless intentionally adding them.

See [ROADMAP.md](ROADMAP.md) for what's planned and what's stubbed.
