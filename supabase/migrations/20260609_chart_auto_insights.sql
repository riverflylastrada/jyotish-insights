-- ============================================================
-- Permanent storage for auto-insights, decoupled from the chart snapshot.
--
-- Problem this fixes: auto-insights (the AI mini-readings shown on a chart)
-- were stored INSIDE charts.snapshot. But the snapshot is regenerated whenever
-- the engine version bumps (every deploy that changes CURRENT_SNAPSHOT_VERSION),
-- which OVERWRITES the snapshot WITHOUT the insights — so the client re-generated
-- them on the next view, re-incurring the (expensive) auto-insights LLM call for
-- the SAME chart, over and over after each deploy.
--
-- Fix: store insights in their own column that snapshot regeneration never
-- touches, so each chart's insights are generated exactly ONCE and survive
-- deploys. RLS is inherited from the charts table (owner-scoped); no new policy.
--
-- Idempotent.
-- ============================================================

ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS auto_insights jsonb;
