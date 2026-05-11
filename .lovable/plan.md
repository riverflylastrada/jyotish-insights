# Plan — Jyotish Sage Ship-Ready Polish

Backend (AstroWorld / FastAPI) deferred. Mock provider stays. Goal: take the app from "feature-complete with rough edges" to "ship-ready" everywhere except the real calculation engine.

## Phase 1 — Debate Engine: streaming verified end-to-end

**Why:** edge function exists; UI may drop chunks mid-stream. This is the signature feature — must be flawless.

- Curl `guru-debate` edge function in both `guru` and `verdict` modes; capture raw SSE format.
- Audit `Debate.tsx` SSE parser: fix partial-JSON buffer reset, ensure each Guru's verdict streams in as it completes (not all at once at the end).
- Per-Guru status states: `pending → thinking → streaming → done`, with animated copy ("Parashara Guru is reviewing the chart…", etc.) per spec.
- Main Guru synthesis panel renders only after all 5 finish; show its own streaming state.
- "Ask a follow-up" input re-runs debate with custom question; question persists in `useDebateStore`.
- Animated playback ("Watch the debate") — sequential chat-bubble reveal via Framer Motion.
- Error handling: if one Guru fails, mark that card as errored, continue with others, Main Guru notes the missing voice.

## Phase 2 — Server-generated PDF export

**Why:** browser print is fragile (page breaks, fonts, headers). Need true server PDF.

- New edge function `render-report`:
  - Accepts `chartId` (auth-protected).
  - Loads chart snapshot from DB.
  - Renders HTML matching `Report.tsx` structure (cover, exec summary, panchang, D1, all 16 vargas, Vimshottari table, yogas top 25, doshas, ashtakavarga, 5 Guru reports, remedies, glossary).
  - Calls **PDFShift API** (HTML → PDF, free tier sufficient). Requires `PDFSHIFT_API_KEY` secret.
  - Returns PDF as base64 or signed URL.
- Replace "Print" button on `Report.tsx` with "Download PDF" → calls edge function → triggers download.
- Loading state: "Generating your 60-page report…" with progress.
- Fallback: if PDFShift fails, gracefully fall back to browser print with toast.

## Phase 3 — Empty / error / loading states (every page)

**Empty states** — illustration + headline + CTA on:
- `Library.tsx` — "No charts yet. Cast your first." → `/app/new`
- `Dashboard.tsx` — first-time user welcome
- Search/filter no-results across Library, Yogas, Transits.

**Error states**:
- Replace any raw error text with friendly card: "Our calculation engine is briefly unavailable. Your chart is saved." + Retry button.
- Network errors never expose stack traces.
- 404 page polished with brand styling.

**Loading states** — shape-matching skeletons (no spinners) on:
- Chart Detail (left chart panel, center tabs, right snapshot).
- Library table rows.
- Divisional charts grid.
- Dasha timeline.
- Debate cards (5 skeleton Guru cards).

**New Chart submission flow** — full-page progress per spec:
"Computing planetary positions… → Drawing 16 divisional charts… → Running Vimshottari Dasha… → Detecting Yogas & Doshas… → Consulting the Gurus…"

## Phase 4 — Mobile responsiveness pass

- Chart Detail: 12-col grid collapses to single column; left chart panel becomes top sticky.
- Debate: 5-column grid → vertical stack on mobile.
- Dasha timeline: horizontal scroll with pinch zoom hint.
- Library table → card list on mobile.
- Sidebar nav → bottom-sheet drawer on mobile.
- Test at 375px, 414px, 768px breakpoints.

## Phase 5 — Accessibility (WCAG AA)

- Audit color contrast on `--text-tertiary`, `--text-muted` against `--bg-canvas` (likely needs darkening).
- ARIA labels on all Kundli SVG charts (describe planets in houses).
- Keyboard nav: tab order across Chart Detail tabs, debate cards, dasha timeline.
- Focus rings visible (currently using `--ring`).
- `prefers-reduced-motion` respected on all Framer Motion animations.
- Form labels properly associated on Auth, NewChart, Settings.

## Phase 6 — Polish details

- **Privacy notice** on `NewChart.tsx`: "Your birth data is encrypted at rest…" (DPDP Act).
- **Footer micro-copy** on landing + report: "These analyses are for self-reflection…"
- **Settings page**: add Language (English active, Hindi/Gujarati "Coming Soon"), Display theme toggle (Light only for v1, Dark "Coming Soon"), transit notification placeholder.
- **Share link page**: ensure read-only mode hides Save/Recalculate/Delete actions, shows "Viewing shared chart" banner.
- **Toast consistency**: all success/error use Sonner with consistent copy patterns.
- **Loading copy**: replace generic "Loading…" everywhere with contextual phrases.
- **Sample chart** on landing "See Sample Report" → opens demo chart (15 Aug 1980, 14:30, Ahmedabad) without auth.

## Technical Details

**Edge function `render-report`:**
- File: `supabase/functions/render-report/index.ts`
- Auth: validate JWT, verify user owns `chartId` (or share token).
- Render: build HTML string with inline CSS matching Fraunces/Inter Tight (Google Fonts CDN OK in PDFShift).
- POST to `https://api.pdfshift.io/v3/convert/pdf` with `{ source: html, sandbox: false }`, Bearer auth.
- Return `{ pdfBase64 }` or stream binary.
- CORS headers from `@supabase/supabase-js/cors`.

**SSE parser fix in `Debate.tsx`:**
- Maintain a rolling `buffer` string; split on `\n\n`; only consume complete `data: …` events; keep incomplete tail in buffer.
- Per-Guru reducer: `{ guruId: { status, text, citations } }`.

**Skeletons:** create `src/components/ui/skeletons/` with one component per page shape (avoids ad-hoc divs).

**Empty state component:** `src/components/ui/empty-state.tsx` — accepts `icon`, `title`, `description`, `action`; reused everywhere.

## Out of scope (explicitly deferred)

- AstroWorld / FastAPI backend deployment + provider wiring (revisit when ready to deploy).
- Real geocoding for `NewChart` place autocomplete (keeping current city list).
- Birth Time Rectification flow.
- Dark mode.
- Hindi / Gujarati i18n.
- Payments / pricing tiers.
- Analytics (PostHog/Plausible) — placeholders only.

## Build order

1 → 2 → 3 → 4 → 5 → 6. Pause after Phase 2 for testing the new PDF flow (needs PDFShift key).

## Required from you

- **PDFShift API key** (free tier: https://pdfshift.io — 50 credits/mo free). I'll request it via the secrets tool when Phase 2 starts.
