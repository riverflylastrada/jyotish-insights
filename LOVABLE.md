# Lovable & external UI tools — rules of engagement

**Status (2026-05-27): Lovable is NOT used to commit to this repo.** UI/UX is
maintained directly by the maintainer + Claude Code. This file records *why*, and
the guardrails that apply **if** Lovable (or any automated UI tool) is ever
reconnected.

## Why Lovable was retired from this repo

This project's value is its **calculation engine** — Swiss-Ephemeris-parity Vedic
math living in `supabase/functions/`. The frontend is a thin, well-specified view
over a fixed data contract (`src/lib/astro/types.ts` → `KundliData`). Lovable's
model assumes it *owns* the Supabase backend, so it repeatedly:

- repointed `.env` to its own throwaway Supabase project,
- regenerated `src/integrations/supabase/types.ts` against that project (deleting
  the admin schema: `app_settings`, `profiles.role`, `admin_get_*` RPCs),
- band-aided the resulting type errors with `(supabase as any)` casts — hiding the
  breakage so CI stayed green,
- committed straight to `main`.

It also produces *plausible-looking but fabricated* astrology content (hardcoded
"synthesis" text, placeholder Moons, fixed dasha names), which is exactly what
the engine work has spent months eliminating. See `CONTRIBUTING.md` §"Never
fabricate". For a thin, mostly-complete UI, the review/repair tax outweighs the
benefit.

**Where Lovable may still help:** as a *throwaway visual-mockup generator* in its
own sandbox. Screenshot the look; port the styling into this repo by hand.
**Nothing Lovable builds gets merged.**

## Hard rules for ANY automated UI contributor (Lovable, Devin, etc.)

1. **Branch + PR only — never commit to `main`.** One coherent change per PR.
2. **Never touch the backend wiring.** Off-limits without explicit maintainer
   sign-off:
   - `.env` and `.do/app.yaml` — the Supabase project is `bkdfseyhusoxiruhuhbs`.
     (Note: DigitalOcean injects build-time envs that override `.env`, so a `.env`
     edit silently breaks *local* dev while prod keeps building — easy to miss.)
   - `src/integrations/supabase/types.ts` — generated from the real project's
     schema; do not regenerate against a different project.
   - `supabase/functions/**` — the engine and edge functions.
   - `.github/workflows/**`, `supabase/migrations/**`.
3. **No `(x as any)` to silence type errors.** If types don't line up, the wiring
   is wrong — fix the cause, don't cast over it.
4. **No fabricated data in the UI.** Render real computed `KundliData` fields, or
   an honest empty/placeholder state. Never hardcode chart-specific specifics
   (signs, dashas, scores, "synthesis" prose).
5. **Match the design system**, don't introduce a parallel one. Tokens:
   `text-text-{primary,secondary,tertiary,muted}`, `bg-{surface,elevated,canvas}`,
   `border-hairline-subtle`, `brand-{maroon,saffron,gold}`, `semantic-{positive,
   negative,warning}`; fonts `font-display`/`font-deva`/`font-mono`; page pattern =
   `mx-auto max-w-* px-6 py-8` + eyebrow + `font-display` h1 + intro + `Loader2`
   loading state + dashed-border empty state. Reuse `KundliChart` and shadcn/ui.
6. **CI must pass for real** (`.github/workflows/ci.yml`) — not because errors were
   cast away.
7. **Sahams must stay O(1).** The `sahams.ts` module computes 36 Sahams from
   planet/lagna longitudes in constant time (no time-scans, no per-day loops).
   If adding or modifying Sahams, validate against PyJHora
   `jhora.horoscope.transit.saham` for the reference chart (23 Aug 1983, 15:35
   IST, Patan) with ±0.5° tolerance — assert **PyJHora's actual values**, never
   the engine's own output.

## Note on secrets

`.env` / `.do/app.yaml` carry only the Supabase **anon/publishable** key and URL,
which are public-by-design (protected by RLS). The **service-role** key must live
only in Supabase function secrets — never in the repo, a build env, or a commit.

See `CONTRIBUTING.md` for engine conventions and `ROADMAP.md` for status.
