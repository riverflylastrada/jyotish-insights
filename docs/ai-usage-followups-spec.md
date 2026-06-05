# Devin spec — AI usage follow-ups: configurable pricing + CSV export

**Goal:** the AI usage & cost tracking feature shipped (table + edge logging +
`AdminUsage.tsx`). Two gaps remain: (1) **model pricing is hardcoded** in the edge
function, so changing a rate needs a code deploy; (2) there's **no way to export**
the usage data for accounting. Make pricing **editable from the admin panel** (no
redeploy) and add **CSV export**. One PR.

**Explicitly OUT of scope (separate spec later):** hard per-user quotas /
request-path rate-limiting. Those touch the user-facing AI response path and need
product decisions — do not add enforcement that can block a user's request here.

## Guardrails (LOVABLE.md) — read first
- Branch off `main`; **ONE PR**; never commit to `main`; **do NOT merge** — the
  maintainer reviews the migration + edge-gates the `guru-debate` deploy. CI
  **auto-applies migrations on merge**, so the migration must be correct +
  idempotent (`if not exists` / `on conflict do nothing`).
- **Authorized for this feature:** ONE new migration under `supabase/migrations/`
  (seed rows only — no new table); edit `supabase/functions/guru-debate/index.ts`
  and (if it computes cost) `supabase/functions/voice-session/index.ts`; edit
  `src/pages/admin/AdminLlmConfig.tsx` and `src/pages/admin/AdminUsage.tsx`.
- **Off-limits:** `supabase/functions/calculate-kundli/**`, `.env`, `.do/app.yaml`,
  `.github/workflows/**`. `src/integrations/supabase/types.ts`: **no change** —
  `app_settings` is already typed; we reuse it, no new table. No `(x as any)`. No
  fabricated data. This does **not** touch the chart engine → **do NOT** bump
  `CURRENT_SNAPSHOT_VERSION`.
- **Pricing load MUST be best-effort and non-blocking:** read pricing **once per
  request** (alongside the existing config read), wrapped in try/catch; on ANY
  failure fall back to the in-file hardcoded defaults. A pricing read must never
  add latency to, delay, or fail the user's AI response. Cost is already computed
  in the fire-and-forget logging path — keep it there.

## Reference facts (verified in the codebase — reuse, don't reinvent)
- **Hardcoded pricing today:** `MODEL_PRICING: Record<string,[number,number]>` (USD
  per 1M `[in, out]`) at `supabase/functions/guru-debate/index.ts:14-26`, consumed
  by `computeCost(model, promptTok, completionTok)` at `:28-32` (unknown model →
  returns 0). Called at `:261` and `:410` to fill `ai_usage.cost_usd`. Current
  values: `anthropic/claude-sonnet-4` & `claude-sonnet-4` [3,15]; `gpt-4o` &
  `openai/gpt-4o` [2.5,10]; `gpt-4o-mini` & `openai/gpt-4o-mini` [0.15,0.6];
  `gemini-2.5-flash` & `google/gemini-2.5-flash` [0.3,2.5]; `gemini-2.5-pro` &
  `google/gemini-2.5-pro` [1.25,10].
- **Config pattern to mirror:** `getLlmConfig()` at `guru-debate/index.ts:76-111`
  reads `app_settings` rows where `category='llm_config'` via the service-role
  admin client. Load pricing the **same way** (one query, same client, same
  request) — ideally fold it into / next to this existing call so there's no extra
  per-call round-trip.
- **`app_settings` schema** (`supabase/migrations/20260522_admin_panel.sql:11-21`):
  `key text UNIQUE`, `value text`, `category text`, `label`, `description`,
  `is_secret`, timestamps. Values are text — store structured data as JSON strings.
- **Admin UI conventions:** pages in `src/pages/admin/`
  (`AdminLlmConfig.tsx` already does `app_settings` upsert for `llm_config` — copy
  its save pattern). Routes in `src/App.tsx:123-129`; nav in
  `src/components/layout/AdminLayout.tsx:5-12`; gate `RequireAdmin`.
- **`AdminUsage.tsx`** fetches `ai_usage` directly
  (`supabase.from('ai_usage').select('*')…limit(10000)` at `:83-94`), aggregates
  client-side with `useMemo`, and already renders summary cards (incl. a ₹ figure),
  by-mode, top-users, and recent-calls tables with a date-range filter + question
  search. Reuse its in-memory filtered row set for the CSV.
- **Migration naming:** `YYYYMMDD_name.sql`; latest is `20260602_ai_usage.sql`.

---

## Part 1 — Migration: seed pricing into `app_settings`
New `supabase/migrations/<date>_llm_pricing.sql`. Idempotently seed the **current
hardcoded defaults** so behavior is identical the moment it ships:
- One row per distinct model, `category='llm_pricing'`,
  `key='pricing:<model>'`, `value='{"in":<n>,"out":<n>}'`, with a human `label`.
- `insert … on conflict (key) do nothing;` (re-runnable).
- (Optional, for the CSV/banner extras) seed `key='inr_per_usd'`
  (`category='general'`) if `AdminUsage` doesn't already source its ₹ rate from
  config; and `key='monthly_budget_usd'` if you implement the budget banner.
- No new table, no RLS changes (`app_settings` already has admin-write / read
  policies from the admin-panel migration — verify and reuse, don't redefine).

## Part 2 — Edge: read pricing from config (best-effort, with fallback)
In `guru-debate/index.ts`:
- Add `loadPricing(adminClient): Promise<Record<string,[number,number]>>` that
  selects `app_settings` where `category='llm_pricing'`, `JSON.parse`s each
  `value` (try/catch per row), and returns `{ 'pricing:'-stripped model → [in,out] }`.
- Build the effective map as `{ ...MODEL_PRICING, ...loaded }` — DB overrides
  defaults; **defaults remain the fallback** so an empty/failed read preserves
  today's behavior, and unknown models still resolve to 0.
- Load **once per request** (next to `getLlmConfig`), pass the effective map into
  `computeCost(map, model, prompt, completion)`. Wrap the load in try/catch → on
  error use `MODEL_PRICING` unchanged. Do not `await` anything new on the
  response's critical path beyond what already exists.
- `voice-session/index.ts`: if it computes `cost_usd`, use the same loader; if it
  logs voice with 0 cost, leave it.

## Part 3 — Admin UI: edit pricing
In `src/pages/admin/AdminLlmConfig.tsx`, add a **"Model Pricing"** section
(match the page's existing layout/tokens):
- Table: model | $ / 1M in | $ / 1M out, rows from `app_settings`
  (`category='llm_pricing'`). Inline-editable numbers; "Add model" row.
- Save via the page's existing `app_settings` upsert (key `pricing:<model>`,
  `category='llm_pricing'`, `value=JSON.stringify({in,out})`). Validate non-negative
  numbers; no `as any`.
- A one-line note: "Used to compute logged AI cost. Takes effect immediately — no
  deploy."

## Part 4 — Admin UI: CSV export
In `src/pages/admin/AdminUsage.tsx`, add an **"Export CSV"** button that downloads
the **currently-filtered** rows (respect the active date-range + search), purely
client-side (Blob + object URL; no backend):
- Columns: `created_at, user, function, mode, guru, model, provider,
  prompt_tokens, completion_tokens, total_tokens, cost_usd, language, success,
  latency_ms, question`. `user` = joined `display_name` else `user_id`.
- Proper CSV escaping — `question` may contain commas, quotes, and newlines
  (wrap in `"…"`, double internal quotes). Filename e.g.
  `ai-usage-YYYY-MM-DD.csv`.
- (Optional) month-to-date budget banner: if `monthly_budget_usd` is set, show a
  banner when this month's summed `cost_usd` exceeds it. Display-only — no blocking.

## Verification
- Apply the migration → `app_settings` has `llm_pricing` rows **exactly matching**
  the old hardcoded map. Trigger a guru question for a known model → `ai_usage`
  `cost_usd` is unchanged vs before (defaults preserved).
- Edit a price in the admin page → trigger another guru question → the **new**
  `cost_usd` reflects the edited rate, **with no redeploy**.
- Unknown model → `cost_usd = 0` (unchanged). Simulate a pricing-read failure →
  falls back to defaults, logging still writes, and **AI response latency is
  unchanged** (logging stays fire-and-forget).
- CSV downloads, opens cleanly in a spreadsheet; a row whose `question` contains a
  comma/quote/newline is escaped correctly.
- `deno check supabase/functions/guru-debate/index.ts
  supabase/functions/voice-session/index.ts`; `npx vitest run && npm run build &&
  npx tsc --noEmit -p tsconfig.app.json` all pass.

## Deliverable
ONE PR against `main`: the seed migration + edge pricing-loader + `AdminLlmConfig`
pricing editor + `AdminUsage` CSV export (+ optional budget banner). No new table,
no `types.ts` change, no engine change. Provider-agnostic (reads response `usage` +
config `model`, same as today). Do **not** merge — the maintainer reviews the
migration and edge-gates the `guru-debate` deploy.
