All four items selected — this is a large surface area. I'll ship in phases so you can verify each one before moving on.

## Phase A — Auth + Library + Settings (Lovable Cloud)
1. **Database**
   - `profiles` table (display_name, ayanamsa, chart_style, house_system) — auto-created on signup via trigger.
   - `charts` table (user_id, name, birth_details JSONB, snapshot JSONB, share_token UUID, created_at).
   - RLS: owner-only read/write on both; public read on `charts` when `share_token` matches.
2. **Auth wiring**
   - Wire existing `Auth.tsx` to `supabase.auth` (email/password + Google via `lovable.auth.signInWithOAuth`).
   - `useSession()` hook; protect `/app/*`; redirect unauthenticated to `/login`.
3. **Library page** — list user's saved charts, open/delete.
4. **Settings page** — edit ayanamsa / chart style / house system on profile; persist; feed `useUserStore`.

## Phase B — Save / Share / Recalculate
- **Save**: persist current `chart` snapshot + birth details to `charts`; toast confirmation; Library picks it up.
- **Share**: copy `…/app/chart/<share_token>` link to clipboard; route resolves shared charts in read-only mode.
- **Recalculate**: re-run `useKundli` with `refetch()` and bust cache.

## Phase C — Verify Debate streaming end-to-end
- Curl the `guru-debate` edge function in both `guru` and `verdict` modes; check logs.
- Fix any SSE parsing bugs in `Debate.tsx` (current parser has a minor edge case where partial JSON resets the buffer incorrectly).

## Phase D — Server-generated PDF
- New edge function `render-report` using Deno + a lightweight HTML→PDF approach (Puppeteer not available in Deno edge; use [`@react-pdf/renderer` server-side] or render HTML and return via headless rendering service). 
- Realistic option for Supabase Edge Functions: build a print-styled HTML server-side and return it; OR use the **Browserless** / **PDFShift** API (requires an API key from you).
- Recommended: **PDFShift** (simple HTML→PDF REST API, free tier). I'll request the API key when we reach Phase D.
- Replace "Print" button with "Download PDF" that calls the edge function and downloads the file.

## Order of execution
A → B → C → D, pausing after each phase so you can test in the preview.

## Technical notes
- No changes to existing astro provider / mock data.
- `share_token` allows public read without exposing user_id.
- Settings preferences sync into Zustand on login so chart rendering picks them up immediately.
- Debate parser fix: properly handle SSE chunks split across `read()` boundaries.

Shall I start with **Phase A**?