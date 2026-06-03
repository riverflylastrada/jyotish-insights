# Devin Task 01 — Gun-Milan (Ashtakoota) edge engine

**Repo:** `jyotish-insights` — a Vedic astrology platform (React 18 + Vite +
TypeScript frontend; Supabase Postgres + Deno Edge Functions). Read
[CONTRIBUTING.md](../../CONTRIBUTING.md) before starting.

## Goal
Build a reusable, parity-tested **server-side 36-point Ashtakoota (Guna Milan)**
engine and wire it into the `voice-tools` `check_compatibility` tool, which is
currently an honest stub. This also gives the rest of the app one shared
compatibility implementation instead of frontend-only logic.

## Context / current state
- The 36-point Ashtakoota matching — **Varna, Vasya, Tara, Yoni, Graha Maitri,
  Gana, Bhakoot, Nadi** — currently powers `src/pages/app/Compatibility.tsx`.
  **First locate where that computation actually lives** (a frontend lib, or
  inline in the page) and treat it as the source of truth to reuse — do not
  re-derive different rules.
- `supabase/functions/calculate-kundli/south_indian_match.ts` (+
  `south_indian_match_test.ts`) is the established pattern for a **server-side
  compatibility module with a parity test** (it implements the Tamil
  10-Porutham system — a sibling, not the 36-point Ashtakoota).
- `supabase/functions/voice-tools/index.ts` → `case "check_compatibility"`
  currently returns `{ ok:false, summary:"…not yet supported…" }`.
- Engine entry: `supabase/functions/calculate-kundli/engine.ts`
  (`calculateKundli(details)`, `BirthDetails`).

## Scope
1. Create `supabase/functions/calculate-kundli/gun_milan.ts` exporting a **pure
   function** that takes two charts (or two `BirthDetails`) and returns the 8
   Kootas with per-Koota awarded/max points, the total out of 36, and a verdict
   band (e.g. <18 not recommended / 18–24 average / 25–32 good / 33–36 excellent)
   — reusing the existing Compatibility-page rules verbatim. If that logic is
   frontend-only today, **extract it into a shared module** and have both the
   page and this engine import one implementation (no rule drift).
2. Add `gun_milan_test.ts` validating the total **and each individual Koota**
   against a reference pair computed in **AstroSage / Jagannatha Hora**. Embed
   the reference birth details + expected per-Koota points in the test and cite
   the source in comments.
3. Wire `voice-tools` `check_compatibility` to call it: accept two birth-detail
   sets in the tool payload (boy/girl or partner A/B), compute, and return a
   compact `{ ok, summary, data }` where `summary` is a one-line spoken result
   (e.g. "28 out of 36 gunas match — a good match; Nadi koota is the one
   concern.") and `data` carries the per-Koota breakdown.

## Out of scope
- UI changes to the Compatibility page beyond the refactor needed to share logic.
- Other matching systems (Dashakoot, Tamil Porutham — already exists).
- Dosha-cancellation deep dives (Mangal/Nadi parihara) beyond what the existing
  rules already encode.

## Acceptance criteria
- `deno test supabase/functions/calculate-kundli/` and
  `deno check supabase/functions/calculate-kundli/engine.ts
  supabase/functions/voice-tools/index.ts` pass.
- The new `gun_milan_test.ts` asserts parity (total + each Koota) to the embedded
  AstroSage/JHora reference.
- The Compatibility page's output is **unchanged** on the same inputs
  (byte-identical if you refactored shared logic — add/keep a frontend test or
  manually verify a known pair).
- `voice-tools` `check_compatibility` returns a real grounded result (no stub).
- **Additive only** — no `CURRENT_SNAPSHOT_VERSION` bump. Follow the
  parity-over-plausibility rule in CONTRIBUTING.md.

## Notes
- The voice agent's tool, once live, will pass two sets of birth details the
  Guru collected verbally — so the function must accept raw `BirthDetails`, not a
  pre-computed chart only.
