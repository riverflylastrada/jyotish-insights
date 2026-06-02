-- ============================================================
-- AI Usage & Cost Tracking Migration
-- Adds: public.ai_usage table + indexes + RLS policies.
-- Edge functions INSERT via service-role (bypasses RLS).
-- Users SELECT own rows; admins SELECT all.
-- ============================================================

-- 1. ai_usage table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  function        text,
  mode            text,
  guru            text,
  chart_id        uuid        REFERENCES public.charts(id) ON DELETE SET NULL,
  question        text,
  model           text,
  provider        text,
  prompt_tokens   integer     NOT NULL DEFAULT 0,
  completion_tokens integer   NOT NULL DEFAULT 0,
  total_tokens    integer     NOT NULL DEFAULT 0,
  cost_usd        numeric(12,6) NOT NULL DEFAULT 0,
  language        text,
  success         boolean     NOT NULL DEFAULT true,
  error           text,
  latency_ms      integer
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx
  ON public.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx
  ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_mode_idx
  ON public.ai_usage (mode);

-- 3. RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can see their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_usage' AND policyname = 'Users select own ai_usage'
  ) THEN
    CREATE POLICY "Users select own ai_usage"
      ON public.ai_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Admins can see all rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_usage' AND policyname = 'Admins select all ai_usage'
  ) THEN
    CREATE POLICY "Admins select all ai_usage"
      ON public.ai_usage FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- No INSERT/UPDATE/DELETE policies for client-side.
-- Edge functions write via service-role key (bypasses RLS).
