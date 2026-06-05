-- ============================================================
-- Daily Morning Kundli Email — foundation
-- Adds: profiles.email_daily_enabled opt-in (default OFF),
--       public.daily_email_sends send-log (one row per user per local day),
--       app_settings seeds for listmonk + send config.
-- The daily-email edge function writes the log via service-role (bypasses RLS).
-- Idempotent / re-runnable (CI auto-applies migrations on merge).
-- ============================================================

-- 1. Opt-in flag (affirmative consent — default OFF)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_daily_enabled boolean NOT NULL DEFAULT false;

-- 2. Send log — the (user_id, local_date) unique key is the claim-before-send
--    lock that guarantees exactly one email per user per local calendar day.
CREATE TABLE IF NOT EXISTS public.daily_email_sends (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date          date        NOT NULL,
  status              text        NOT NULL DEFAULT 'pending',  -- pending|sent|failed|skipped
  llm_used            boolean     NOT NULL DEFAULT false,
  listmonk_message_id text,
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS daily_email_sends_user_id_idx
  ON public.daily_email_sends (user_id);
CREATE INDEX IF NOT EXISTS daily_email_sends_local_date_idx
  ON public.daily_email_sends (local_date DESC);

-- 3. RLS — users may read their own send history; no client write policy
--    (the edge function writes via the service-role key, which bypasses RLS).
ALTER TABLE public.daily_email_sends ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_email_sends' AND policyname = 'Users select own daily_email_sends'
  ) THEN
    CREATE POLICY "Users select own daily_email_sends"
      ON public.daily_email_sends FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 4. Config seeds (editable in Admin → API Keys). Secrets flagged is_secret.
INSERT INTO public.app_settings (key, value, category, label, description, is_secret)
VALUES
  ('listmonk_url',             '',     'api_keys', 'Listmonk Base URL',            'e.g. https://mail.example.com (no trailing slash)', false),
  ('listmonk_api_user',        '',     'api_keys', 'Listmonk API User',            'Listmonk API username for HTTP basic auth',         false),
  ('listmonk_api_token',       '',     'api_keys', 'Listmonk API Token',           'Listmonk API access token (HTTP basic password)',   true),
  ('listmonk_list_id',         '',     'api_keys', 'Listmonk Daily-Kundli List ID','Numeric list id subscribers are added to',           false),
  ('listmonk_tx_template_id',  '',     'api_keys', 'Listmonk Tx Template ID',      'Transactional template id used for the daily email', false),
  ('daily_email_morning_hour', '7',    'general',  'Daily email send hour (local)','0–23; sent when the local hour matches',             false),
  ('daily_email_llm_budget_usd','2.00','general',  'Daily LLM budget for emails',  'USD/day cap; over budget falls back to no-LLM',      false)
ON CONFLICT (key) DO NOTHING;
