-- ============================================================
-- Saved Guru Readings
-- Persists every completed "ask a Guru" Q&A (single guru, full
-- tribunal debate, or Prashna) so it survives a page refresh and
-- is re-readable later — both per-chart and on a global "My
-- Readings" page. Owner-only (RLS); the client writes with the
-- user's own session (auth.uid() = user_id).
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.saved_readings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_id    uuid        REFERENCES public.charts(id) ON DELETE CASCADE,
  -- 'single' = one guru, 'debate' = full tribunal + verdict, 'prashna' = horary
  kind        text        NOT NULL DEFAULT 'single',
  -- guru keys consulted (1 for single, up to 8 for a debate)
  gurus       text[]      NOT NULL DEFAULT '{}',
  question    text        NOT NULL,
  -- { readings: [{ guru, text }], verdict?: string }
  answer      jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS saved_readings_user_created_idx
  ON public.saved_readings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_readings_chart_created_idx
  ON public.saved_readings (chart_id, created_at DESC);

-- 3. RLS — owner-only (client writes with the user's session)
ALTER TABLE public.saved_readings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_readings' AND policyname = 'Users select own saved_readings'
  ) THEN
    CREATE POLICY "Users select own saved_readings"
      ON public.saved_readings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_readings' AND policyname = 'Users insert own saved_readings'
  ) THEN
    CREATE POLICY "Users insert own saved_readings"
      ON public.saved_readings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_readings' AND policyname = 'Users delete own saved_readings'
  ) THEN
    CREATE POLICY "Users delete own saved_readings"
      ON public.saved_readings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;
