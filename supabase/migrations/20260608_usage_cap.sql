-- ============================================================
-- Per-user weekly AI usage cap (pre-monetisation guardrail).
--
-- Adds two tiers of rolling-7-day limits, enforced in the edge
-- functions before any LLM/voice call:
--   * usage_weekly_cap_questions (default 25) — all AI "question
--     events": single-guru asks, debates, prashna, auto-insights, voice.
--   * usage_weekly_cap_debates   (default 3)  — the expensive multi-guru
--     tribunal (Debate + Prashna), which fans out to ~9 LLM calls each.
-- Admins and an admin-managed allowlist are exempt. The whole thing is a
-- master-switch away from off (usage_cap_enabled) and is meant to be
-- removed/loosened once paid plans (Razorpay) ship.
--
-- A "question event" = one user submission. The tribunal fires up to 8
-- guru calls + 1 verdict, so all calls of one submission share a client-
-- generated turn_id; counting DISTINCT turn_id (not rows) makes the caps
-- match what a user perceives as a question. turn_kind tags the event so
-- the debate tier can be counted separately.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING / CREATE OR REPLACE.
-- ============================================================

-- 1. Tag columns on the append-only usage log (plain columns, nullable).
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS turn_id   uuid;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS turn_kind text;  -- 'debate'|'single'|'auto'|'voice'

-- Composite index for the per-user rolling-window count.
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx
  ON public.ai_usage(user_id, created_at DESC);

-- 2. Efficient counter used by the edge cap check. Counts DISTINCT
--    question-turns (rows without a turn_id count as their own turn via
--    coalesce(turn_id, id)), optionally excluding the in-progress turn so
--    a multi-call submission never blocks its own later calls.
--    SECURITY DEFINER (reads the admin-only ai_usage); execute restricted
--    to service_role so a normal user can't probe another user's counts.
CREATE OR REPLACE FUNCTION public.usage_turn_counts(
  p_user         uuid,
  p_since        timestamptz,
  p_exclude_turn uuid DEFAULT NULL
)
RETURNS TABLE(questions_used integer, debates_used integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT COALESCE(turn_id::text, id::text))::int AS questions_used,
    (COUNT(DISTINCT COALESCE(turn_id::text, id::text))
      FILTER (WHERE turn_kind = 'debate'))::int            AS debates_used
  FROM public.ai_usage
  WHERE user_id = p_user
    AND created_at >= p_since
    AND success = true
    AND (p_exclude_turn IS NULL OR turn_id IS DISTINCT FROM p_exclude_turn);
$$;

REVOKE ALL ON FUNCTION public.usage_turn_counts(uuid, timestamptz, uuid) FROM public;
REVOKE ALL ON FUNCTION public.usage_turn_counts(uuid, timestamptz, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_turn_counts(uuid, timestamptz, uuid) TO service_role;

-- 3. Seed the cap configuration into app_settings (editable in the admin
--    panel; takes effect immediately, no redeploy). Allowlist is a JSON
--    array of user_id strings the admin manages from Admin → AI Usage.
INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('usage_cap_enabled',           'true', 'usage_limits', 'Weekly AI cap — enabled',        'Master switch for the per-user weekly AI usage cap. Set to false to disable all limits.', false),
  ('usage_weekly_cap_questions',  '25',   'usage_limits', 'Weekly cap — questions / user',  'Max AI question-events per user per rolling 7 days (single-guru asks, debates, prashna, auto-insights, voice).', false),
  ('usage_weekly_cap_debates',    '3',    'usage_limits', 'Weekly cap — debates / user',    'Max full multi-guru Debate/Prashna tribunals per user per rolling 7 days. Beyond this, steer users to single-guru questions.', false),
  ('usage_cap_allowlist',         '[]',   'usage_limits', 'Weekly cap — exempt user IDs',   'JSON array of auth user_id strings exempt from the cap (admins are always exempt). Managed from Admin → AI Usage.', false)
ON CONFLICT (key) DO NOTHING;
