-- ============================================================
-- Social Bot + Tweet Scheduler Migration
-- Adds: social_feature_flags, social_settings (singleton),
--       scheduled_tweets, social_runs + admin-only RLS.
-- Edge functions write via service-role (bypasses RLS).
-- X (Twitter) OAuth credentials are seeded into app_settings
-- (category 'api_keys', is_secret) so they appear in the existing
-- Admin → API Keys masked editor with zero new UI.
-- ============================================================

-- ── 1. social_feature_flags (mirrors the reference Feature Flags card) ──────
CREATE TABLE IF NOT EXISTS public.social_feature_flags (
  key         text PRIMARY KEY,
  label       text,
  description text,
  enabled     boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.social_feature_flags (key, label, description, enabled) VALUES
  ('SOCIAL_BOT_TWITTER_ENABLED', 'Twitter/X Bot',     'Master switch for the Twitter/X bot.',                      false),
  ('TWEET_SCHEDULER_ENABLED',    'Tweet Scheduler',   'Controls the scheduled auto-poster (the 15-min tick).',      false),
  ('SOCIAL_BOT_REDDIT_ENABLED',  'Reddit Bot',        'Controls the Reddit bot. Reserved for a later phase.',       false)
ON CONFLICT (key) DO NOTHING;

-- ── 2. social_settings (singleton row, id = 1) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_settings (
  id               int  PRIMARY KEY DEFAULT 1,
  twitter_enabled  boolean          NOT NULL DEFAULT false,
  max_per_day      int              NOT NULL DEFAULT 16,
  max_per_hour     int              NOT NULL DEFAULT 10,
  poll_interval_min int             NOT NULL DEFAULT 15,
  default_city     text             NOT NULL DEFAULT 'Bharuch',
  default_lat      double precision DEFAULT 21.7051,
  default_lon      double precision DEFAULT 72.9959,
  default_tz       text             NOT NULL DEFAULT 'Asia/Kolkata',
  -- Primary language first; the auto cadence posts in languages[0].
  languages        jsonb            NOT NULL DEFAULT '["hi","en"]'::jsonb,
  include_link     boolean          NOT NULL DEFAULT false,
  fetch_metrics    boolean          NOT NULL DEFAULT false,
  last_poll_at     timestamptz,
  updated_at       timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT social_settings_singleton CHECK (id = 1)
);

INSERT INTO public.social_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 3. scheduled_tweets (the queue) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_tweets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at  timestamptz NOT NULL,
  content_type  text        NOT NULL CHECK (content_type IN ('panchang','rashifal','transit','rashi_effect')),
  variant       text,       -- rashifal_hook | rashifal_thread | muhurat | ingress | retro | direct | rashi_effect | proof_flex
  rashi         text,       -- the reference "Symbol" column, repurposed as Rashi
  language      text        NOT NULL DEFAULT 'en',
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted','failed','cancelled')),
  body          text,
  thread        jsonb,      -- array of strings for multi-tweet threads
  media_url     text,
  tweet_id      text,
  impressions   int         NOT NULL DEFAULT 0,
  likes         int         NOT NULL DEFAULT 0,
  error         text,
  generated_by  text        NOT NULL DEFAULT 'auto' CHECK (generated_by IN ('auto','manual')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  posted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS scheduled_tweets_status_sched_idx
  ON public.scheduled_tweets (status, scheduled_at);

-- Idempotency backstop for the "Generate Week" job: at most one auto row per
-- (content_type, variant, exact slot time, rashi). scheduled_at is deterministic
-- per slot, so a re-run produces identical timestamps. coalesce() + bare columns
-- keep the expression IMMUTABLE (a timestamptz::date cast would NOT be).
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_tweets_auto_idem_idx
  ON public.scheduled_tweets (content_type, coalesce(variant, ''), scheduled_at, coalesce(rashi, ''))
  WHERE generated_by = 'auto';

-- ── 4. social_runs (activity log → Logs / "Last 24 Hours" / last-poll) ──────
CREATE TABLE IF NOT EXISTS public.social_runs (
  id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at  timestamptz NOT NULL DEFAULT now(),
  action  text        CHECK (action IN ('scheduler_tick','generate_week','generate','post_now','fetch_metrics')),
  result  text        CHECK (result IN ('ok','skipped','error')),
  detail  jsonb
);

CREATE INDEX IF NOT EXISTS social_runs_ran_at_idx ON public.social_runs (ran_at DESC);

-- ── 5. updated_at triggers (reuse public.set_updated_at from admin_panel) ────
DROP TRIGGER IF EXISTS social_feature_flags_set_updated_at ON public.social_feature_flags;
CREATE TRIGGER social_feature_flags_set_updated_at BEFORE UPDATE ON public.social_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS social_settings_set_updated_at ON public.social_settings;
CREATE TRIGGER social_settings_set_updated_at BEFORE UPDATE ON public.social_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS scheduled_tweets_set_updated_at ON public.scheduled_tweets;
CREATE TRIGGER scheduled_tweets_set_updated_at BEFORE UPDATE ON public.scheduled_tweets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. RLS — admin-only read+write; edge functions use service-role ─────────
ALTER TABLE public.social_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tweets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_runs          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  is_admin constant text := 'EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = ''admin'')';
BEGIN
  FOREACH t IN ARRAY ARRAY['social_feature_flags','social_settings','scheduled_tweets','social_runs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins all %1$s" ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY "Admins all %1$s" ON public.%1$s FOR ALL USING (%2$s) WITH CHECK (%2$s)',
      t, is_admin
    );
  END LOOP;
END$$;

-- ── 7. X (Twitter) OAuth 1.0a credentials → Admin → API Keys ────────────────
INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('X_API_KEY',       '', 'api_keys', 'X (Twitter) API Key',          'OAuth 1.0a consumer/API key for the @AcharyaJyotish bot. From developer.x.com.', true),
  ('X_API_SECRET',    '', 'api_keys', 'X (Twitter) API Secret',       'OAuth 1.0a consumer/API secret.',                                              true),
  ('X_ACCESS_TOKEN',  '', 'api_keys', 'X (Twitter) Access Token',     'OAuth 1.0a access token (user context) for the bot account.',                  true),
  ('X_ACCESS_SECRET', '', 'api_keys', 'X (Twitter) Access Secret',    'OAuth 1.0a access token secret.',                                              true),
  ('X_BEARER_TOKEN',  '', 'api_keys', 'X (Twitter) Bearer Token',     'Optional: only needed when Fetch Metrics is enabled (read endpoints).',         true)
ON CONFLICT (key) DO NOTHING;
