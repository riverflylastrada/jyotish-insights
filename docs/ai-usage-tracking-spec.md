# Devin spec — AI usage & cost tracking (per-user questions + tokens) + Admin analytics

**Goal:** today nothing records who asked the AI what, how many tokens it used, or
what it cost — so we can't plan pricing. Build (1) a Supabase `ai_usage` table,
(2) best-effort logging from the edge functions on every LLM call, and (3) an
Admin analytics page. One PR.

## Guardrails (LOVABLE.md) — read first
- Branch off `main`; ONE PR; never commit to `main`; **do NOT merge** — the
  maintainer reviews the migration + edge-gates the function deploy.
- **Authorized for this feature:** add ONE new migration under
  `supabase/migrations/` (table + indexes + RLS), and edit the edge functions
  `guru-debate` (and optionally `voice-session`). CI **auto-applies migrations on
  merge**, so the migration must be correct + idempotent (`if not exists`).
- Off-limits: `.env`, `.do/app.yaml`, `.github/workflows/**`,
  `supabase/functions/calculate-kundli/**`. `src/integrations/supabase/types.ts`:
  only a surgical add of the new `ai_usage` row type. No `(x as any)`. No
  fabricated data. Match the existing admin-page design.
- This does **not** touch the chart engine → **do NOT** bump
  `CURRENT_SNAPSHOT_VERSION`.
- **Logging MUST be best-effort and non-blocking:** a logging failure (or slow
  insert) must never fail or delay the user's AI response. Fire-and-forget,
  wrapped in try/catch. Keep it O(1) — the edge runtime has a hard CPU limit.

## Reference facts (verified in the codebase — reuse, don't reinvent)
- **LLM call sites:** `supabase/functions/guru-debate/index.ts` — the auto-insights
  fetch (~line 150) and the guru/verdict fetch (~line 236). Both POST to an
  OpenAI-compatible chat-completions endpoint and parse a JSON response that
  **already includes** `usage: { prompt_tokens, completion_tokens, total_tokens }`
  (OpenRouter and Azure both return this). The auto-insights path may call twice
  (schema-retry) — log each call.
- **Config:** `app_settings` rows with `category='llm_config'` → `llm_model`,
  `llm_provider`, `llm_endpoint` (loaded by `getLlmConfig()` at ~line 23). Use the
  resolved `model`/`provider` for the pricing lookup + the logged `model` column.
- **Caller identity:** guru-debate does NOT currently extract the caller's
  `user_id`. Add it: read the request `Authorization` header, take the JWT, and
  resolve via the existing admin client — `const { data: { user } } =
  await adminClient.auth.getUser(jwt)`. Handle anonymous (user_id = null) safely.
- **Admin gate:** `profiles.role === 'admin'` (`src/hooks/useAdmin.ts`); admin
  routes use `RequireAdmin`. Existing admin pages live in `src/pages/admin/`
  (`AdminDashboard`, `AdminUsers`, `AdminLlmConfig`, `AdminApiKeys`, `AdminVoice`)
  — match their layout/design tokens.
- **Voice** is partly tracked already in `voice_sessions`
  (`duration_seconds`, `credits_consumed`, `transcript`, `user_id`, `guru_persona`).

---

## Part 1 — Supabase migration: `ai_usage`
```sql
create table if not exists public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  user_id           uuid references auth.users(id) on delete set null,
  function          text not null,           -- 'guru-debate' | 'voice-session'
  mode              text not null,           -- 'guru'|'verdict'|'auto-insights'|'prashna'|'voice'
  guru              text,                     -- persona key, nullable
  chart_id          uuid references public.charts(id) on delete set null,
  question          text,                     -- user's question (nullable; PII — admin-only)
  model             text not null,            -- resolved model id / azure deployment
  provider          text,                     -- 'openrouter' | 'azure' | ...
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  cost_usd          numeric(12,6) not null default 0,
  language          text,
  success           boolean not null default true,
  error             text,
  latency_ms        integer
);
create index if not exists ai_usage_user_id_idx    on public.ai_usage(user_id);
create index if not exists ai_usage_created_at_idx  on public.ai_usage(created_at desc);
create index if not exists ai_usage_mode_idx        on public.ai_usage(mode);

alter table public.ai_usage enable row level security;

-- Users may read ONLY their own usage.
create policy "ai_usage: users read own"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- Admins may read ALL usage (reuse the profiles.role='admin' convention).
create policy "ai_usage: admins read all"
  on public.ai_usage for select
  using (exists (select 1 from public.profiles p
                 where p.user_id = auth.uid() and p.role = 'admin'));

-- No INSERT/UPDATE policy: only the edge functions write, via the service-role
-- key, which bypasses RLS. Clients can never write or read others' rows.
```

## Part 2 — Edge wiring (best-effort logging)
In `guru-debate` (and, if feasible, `voice-session`):
- Resolve the caller's `user_id` once per request (JWT → `adminClient.auth.getUser`).
- After **each** LLM call returns, read `json.usage`, compute cost, and
  fire-and-forget INSERT one `ai_usage` row via the admin (service-role) client.
  Wrap in try/catch; never await in a way that blocks the response path.
- **Cost** = `prompt_tokens/1e6 * inPrice + completion_tokens/1e6 * outPrice`,
  from a small pricing map keyed by `model` (USD per 1M tokens):
  | model | in | out |
  |---|---|---|
  | `anthropic/claude-sonnet-4` | 3.00 | 15.00 |
  | `openai/gpt-4o` / `gpt-4o` | 2.50 | 10.00 |
  | `openai/gpt-4o-mini` / `gpt-4o-mini` | 0.15 | 0.60 |
  | `gemini-2.5-flash` | 0.30 | 2.50 |
  Unknown model → log tokens with `cost_usd = 0` (don't guess).
- Capture per row: `function`, `mode`, `guru`, `chart_id` (if present in the
  request), `question` (the user's question string; for `auto-insights` store
  `null` or `'[auto-insights]'`), `model`, `provider`, the three token counts,
  `cost_usd`, `language`, `success`, `latency_ms` (time around the fetch).
- **On LLM error** (the existing `!r.ok`/catch paths), still log a row with
  `success=false`, the `error`, and 0 tokens — so failed/over-budget calls are
  visible too (e.g. the recent OpenRouter 402s).
- `voice-session`: write an `ai_usage` row per session (`mode='voice'`,
  `function='voice-session'`, tokens if the realtime API exposes them else 0,
  link `chart_id`/`guru`). If the realtime API gives no token counts, still log
  the row with duration so voice shows up in the analytics.

## Part 3 — Admin UI: `src/pages/admin/AdminUsage.tsx`
New admin route `/admin/usage`, gated by `RequireAdmin`, linked from the admin
nav / `AdminDashboard`. Match the existing admin pages' look.
- **Summary cards** (toggle: last 7d / 30d / all): total cost (USD + ₹ at a
  configurable rate), total tokens, total questions, distinct users.
- **By mode** table: mode → count, total tokens, total cost.
- **Top users** table: `display_name` (join `profiles`) / user_id, # questions,
  total tokens, total cost — sortable, paginated.
- **Recent questions** table: time, user, mode, guru, question (truncated, with a
  hover/expand), tokens, cost. Date-range filter + free-text search on question.
- **Cost-per-question** stat: total cost ÷ total questions, and per-mode averages
  (this is the number we're after for pricing).
- Fetch with react-query through the admin's own session (RLS admin policy
  returns all rows). No service-role key in the client.

## Part 4 — Privacy
`question` holds personal questions + birth data → **admin-only** (enforced by
RLS above). Surface a one-line "contains personal data — admin only" note on the
page. Don't expose `ai_usage` to non-admins beyond their own rows. (A retention
cutoff can be a later follow-up.)

## Verification
- Apply the migration; insert sample rows. Confirm RLS: a normal user sees only
  their own rows; an admin sees all; a client cannot INSERT.
- Trigger one guru question and one auto-insights call → exactly one `ai_usage`
  row each, with token counts that match the LLM response `usage`, and a non-zero
  `cost_usd` for a known model. Force an LLM error → a `success=false` row.
- Admin page renders summary + all tables for seeded data; cost-per-question shows.
- Confirm the AI response latency is unchanged (logging is fire-and-forget).
- `tsc`, `vitest`, `build` pass; `deno check` passes for the edited functions.

## Deliverable
ONE PR against `main` (migration + edge wiring + `AdminUsage.tsx` + the surgical
`types.ts` add). Do **not** merge — the maintainer reviews the schema/RLS and
edge-gates the `guru-debate` deploy. Provider-agnostic: works the same after the
planned OpenRouter→Azure switch (it reads the response `usage` + config `model`).
