-- Admin Panel
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user','admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  category text NOT NULL DEFAULT 'general',
  label text,
  description text,
  is_secret boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admins read app_settings') THEN
    CREATE POLICY "Admins read app_settings" ON public.app_settings FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admins insert app_settings') THEN
    CREATE POLICY "Admins insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admins update app_settings') THEN
    CREATE POLICY "Admins update app_settings" ON public.app_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admins delete app_settings') THEN
    CREATE POLICY "Admins delete app_settings" ON public.app_settings FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='admin'));
  END IF;
END $$;
DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('GOOGLE_AI_KEY','','api_keys','Google AI API Key','API key for Google AI Studio (Gemini).',true),
  ('PDFSHIFT_API_KEY','','api_keys','PDFShift API Key','API key for PDF report generation.',true),
  ('OPENROUTER_KEY','','api_keys','OpenRouter API Key','Optional OpenRouter key.',true),
  ('llm_provider','google','llm_config','LLM Provider','google/openrouter/openai',false),
  ('llm_model','gemini-2.5-flash','llm_config','LLM Model','Model id',false),
  ('llm_endpoint','https://generativelanguage.googleapis.com/v1beta/openai/chat/completions','llm_config','LLM API Endpoint','OpenAI-compatible endpoint',false),
  ('llm_api_key_setting','GOOGLE_AI_KEY','llm_config','API Key Setting','References an api_keys entry',false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (user_id uuid, email text, display_name text, role text, ayanamsa text, chart_style text, house_system text, charts_count bigint, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id=auth.uid() AND profiles.role='admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  RETURN QUERY
    SELECT au.id, au.email::text, p.display_name, p.role, p.ayanamsa, p.chart_style, p.house_system,
      COALESCE(c.cnt,0), p.created_at, au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id=au.id
    LEFT JOIN (SELECT ch.user_id, COUNT(*) cnt FROM public.charts ch GROUP BY ch.user_id) c ON c.user_id=au.id
    ORDER BY p.created_at DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id=auth.uid() AND profiles.role='admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  SELECT jsonb_build_object(
    'total_users',(SELECT COUNT(*) FROM auth.users),
    'total_charts',(SELECT COUNT(*) FROM public.charts),
    'users_today',(SELECT COUNT(*) FROM auth.users WHERE created_at>=CURRENT_DATE),
    'charts_today',(SELECT COUNT(*) FROM public.charts WHERE created_at>=CURRENT_DATE),
    'users_this_week',(SELECT COUNT(*) FROM auth.users WHERE created_at>=CURRENT_DATE-INTERVAL '7 days'),
    'charts_this_week',(SELECT COUNT(*) FROM public.charts WHERE created_at>=CURRENT_DATE-INTERVAL '7 days')
  ) INTO result;
  RETURN result;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_app_settings_by_category(_category text)
RETURNS TABLE (key text, value text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.key, s.value FROM public.app_settings s WHERE s.category=_category;
$$;

-- Current location on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_place_name text,
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lon double precision,
  ADD COLUMN IF NOT EXISTS current_timezone text;

-- Transit alerts
CREATE TABLE IF NOT EXISTS public.transit_alerts (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references public.charts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  type text not null,
  severity text not null,
  starts timestamptz not null,
  ends timestamptz,
  title text not null,
  description text not null,
  citation text,
  affected_houses int[],
  read_at timestamptz,
  created_at timestamptz default now(),
  unique (chart_id, event_key)
);
ALTER TABLE public.transit_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transit_alerts' AND policyname='Users select own alerts') THEN
    CREATE POLICY "Users select own alerts" ON public.transit_alerts FOR SELECT USING (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transit_alerts' AND policyname='Users update own alerts') THEN
    CREATE POLICY "Users update own alerts" ON public.transit_alerts FOR UPDATE USING (auth.uid()=user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_transit_alerts_user_unread ON public.transit_alerts (user_id, read_at) WHERE read_at IS NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transit_alerts_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transit_alerts_categories text[] NOT NULL DEFAULT '{all}';

-- Voice sessions
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES public.charts(id) ON DELETE SET NULL,
  guru_persona text NOT NULL DEFAULT 'parashara' CHECK (guru_persona IN ('parashara','saraswati','kp_master','jaimini','varahamihira','mantreshwar','bhrigu','lalkitab')),
  language text DEFAULT 'hi',
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  credits_consumed integer NOT NULL DEFAULT 0,
  conversation_id text,
  transcript jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_sessions' AND policyname='Users select own voice sessions') THEN
    CREATE POLICY "Users select own voice sessions" ON public.voice_sessions FOR SELECT USING (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_sessions' AND policyname='Users insert own voice sessions') THEN
    CREATE POLICY "Users insert own voice sessions" ON public.voice_sessions FOR INSERT WITH CHECK (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_sessions' AND policyname='Users update own voice sessions') THEN
    CREATE POLICY "Users update own voice sessions" ON public.voice_sessions FOR UPDATE USING (auth.uid()=user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS voice_sessions_user_id_idx ON public.voice_sessions (user_id);
CREATE INDEX IF NOT EXISTS voice_sessions_created_at_idx ON public.voice_sessions (created_at);

CREATE OR REPLACE FUNCTION public.admin_get_voice_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id=auth.uid() AND profiles.role='admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  SELECT jsonb_build_object(
    'total_sessions',(SELECT COUNT(*) FROM public.voice_sessions),
    'total_minutes',(SELECT COALESCE(ROUND(SUM(duration_seconds)/60.0),0) FROM public.voice_sessions),
    'sessions_today',(SELECT COUNT(*) FROM public.voice_sessions WHERE created_at>=CURRENT_DATE),
    'minutes_today',(SELECT COALESCE(ROUND(SUM(duration_seconds)/60.0),0) FROM public.voice_sessions WHERE created_at>=CURRENT_DATE),
    'unique_users',(SELECT COUNT(DISTINCT user_id) FROM public.voice_sessions),
    'by_guru',(SELECT COALESCE(jsonb_object_agg(guru_persona,cnt),'{}'::jsonb) FROM (SELECT guru_persona, COUNT(*) cnt FROM public.voice_sessions GROUP BY guru_persona) g),
    'by_language',(SELECT COALESCE(jsonb_object_agg(COALESCE(language,'unknown'),cnt),'{}'::jsonb) FROM (SELECT language, COUNT(*) cnt FROM public.voice_sessions GROUP BY language) l)
  ) INTO result;
  RETURN result;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_voice_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_voice_stats() TO authenticated;

INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('ELEVENLABS_API_KEY','','api_keys','ElevenLabs API Key','ElevenLabs account API key.',true),
  ('ELEVENLABS_WEBHOOK_SECRET','','api_keys','ElevenLabs Webhook Secret','Shared secret for tool calls.',true),
  ('elevenlabs_agent_id','','voice','ElevenLabs Agent ID','Single base ConvAI agent.',false),
  ('elevenlabs_default_guru','parashara','voice','Default Voice Guru','Default persona.',false),
  ('elevenlabs_default_language','hi','voice','Default Voice Language','BCP-47',false),
  ('voice_monthly_minutes_cap','30','voice','Voice Minutes / Month','Advisory cap.',false),
  ('elevenlabs_voice_id_parashara','','voice','Parashara Voice ID','',false),
  ('elevenlabs_voice_id_saraswati','','voice','Saraswati Voice ID','',false),
  ('elevenlabs_voice_id_kp_master','','voice','KP Master Voice ID','',false),
  ('elevenlabs_voice_id_jaimini','','voice','Jaimini Voice ID','',false),
  ('elevenlabs_voice_id_varahamihira','','voice','Varahamihira Voice ID','',false),
  ('elevenlabs_voice_id_mantreshwar','','voice','Mantreshwar Voice ID','',false),
  ('elevenlabs_voice_id_bhrigu','','voice','Bhrigu Voice ID','',false),
  ('elevenlabs_voice_id_lalkitab','','voice','Lal Kitab Voice ID','',false),
  ('voice_guru_enabled','false','voice','Voice Guru — public availability','Master switch.',false)
ON CONFLICT (key) DO NOTHING;

-- Default chart
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_chart_id uuid REFERENCES public.charts(id) ON DELETE SET NULL;

-- AI usage
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  function text, mode text, guru text,
  chart_id uuid,
  question text, model text, provider text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  language text,
  success boolean NOT NULL DEFAULT true,
  error text,
  latency_ms integer,
  turn_id uuid,
  turn_kind text
);
CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON public.ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_mode_idx ON public.ai_usage(mode);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON public.ai_usage(user_id, created_at DESC);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_usage' AND policyname='Users select own ai_usage') THEN
    CREATE POLICY "Users select own ai_usage" ON public.ai_usage FOR SELECT USING (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_usage' AND policyname='Admins select all ai_usage') THEN
    CREATE POLICY "Admins select all ai_usage" ON public.ai_usage FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id=auth.uid() AND profiles.role='admin'));
  END IF;
END $$;

INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('pricing:anthropic/claude-sonnet-4','{"in":3,"out":15}','llm_pricing','Claude Sonnet 4 (OR)','',false),
  ('pricing:claude-sonnet-4','{"in":3,"out":15}','llm_pricing','Claude Sonnet 4','',false),
  ('pricing:gpt-4o','{"in":2.5,"out":10}','llm_pricing','GPT-4o','',false),
  ('pricing:openai/gpt-4o','{"in":2.5,"out":10}','llm_pricing','GPT-4o (OR)','',false),
  ('pricing:gpt-4o-mini','{"in":0.15,"out":0.6}','llm_pricing','GPT-4o Mini','',false),
  ('pricing:openai/gpt-4o-mini','{"in":0.15,"out":0.6}','llm_pricing','GPT-4o Mini (OR)','',false),
  ('pricing:gemini-2.5-flash','{"in":0.3,"out":2.5}','llm_pricing','Gemini 2.5 Flash','',false),
  ('pricing:google/gemini-2.5-flash','{"in":0.3,"out":2.5}','llm_pricing','Gemini 2.5 Flash (OR)','',false),
  ('pricing:gemini-2.5-pro','{"in":1.25,"out":10}','llm_pricing','Gemini 2.5 Pro','',false),
  ('pricing:google/gemini-2.5-pro','{"in":1.25,"out":10}','llm_pricing','Gemini 2.5 Pro (OR)','',false),
  ('inr_per_usd','85','general','INR per USD','',false),
  ('monthly_budget_usd','','general','Monthly AI Budget (USD)','',false),
  ('usage_cap_enabled','true','usage_limits','Weekly AI cap — enabled','',false),
  ('usage_weekly_cap_questions','25','usage_limits','Weekly cap — questions/user','',false),
  ('usage_weekly_cap_debates','3','usage_limits','Weekly cap — debates/user','',false),
  ('usage_cap_allowlist','[]','usage_limits','Weekly cap — exempt IDs','',false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.usage_turn_counts(p_user uuid, p_since timestamptz, p_exclude_turn uuid DEFAULT NULL)
RETURNS TABLE(questions_used integer, debates_used integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    COUNT(DISTINCT COALESCE(turn_id::text,id::text))::int,
    (COUNT(DISTINCT COALESCE(turn_id::text,id::text)) FILTER (WHERE turn_kind='debate'))::int
  FROM public.ai_usage
  WHERE user_id=p_user AND created_at>=p_since AND success=true
    AND (p_exclude_turn IS NULL OR turn_id IS DISTINCT FROM p_exclude_turn);
$$;
REVOKE ALL ON FUNCTION public.usage_turn_counts(uuid,timestamptz,uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_turn_counts(uuid,timestamptz,uuid) TO service_role;

-- Daily email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_daily_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.daily_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  llm_used boolean NOT NULL DEFAULT false,
  listmonk_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);
CREATE INDEX IF NOT EXISTS daily_email_sends_user_id_idx ON public.daily_email_sends(user_id);
CREATE INDEX IF NOT EXISTS daily_email_sends_local_date_idx ON public.daily_email_sends(local_date DESC);
ALTER TABLE public.daily_email_sends ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_email_sends' AND policyname='Users select own daily_email_sends') THEN
    CREATE POLICY "Users select own daily_email_sends" ON public.daily_email_sends FOR SELECT USING (auth.uid()=user_id);
  END IF;
END $$;

INSERT INTO public.app_settings (key,value,category,label,description,is_secret) VALUES
  ('listmonk_url','','api_keys','Listmonk Base URL','',false),
  ('listmonk_api_user','','api_keys','Listmonk API User','',false),
  ('listmonk_api_token','','api_keys','Listmonk API Token','',true),
  ('listmonk_list_id','','api_keys','Listmonk List ID','',false),
  ('listmonk_tx_template_id','','api_keys','Listmonk Tx Template ID','',false),
  ('daily_email_morning_hour','7','general','Daily email send hour','',false),
  ('daily_email_llm_budget_usd','2.00','general','Daily LLM budget','',false),
  ('github_content_token','','api_keys','GitHub Content Token','',true),
  ('github_content_repo','Viewofmind/learn-acharyajyotish','api_keys','Learn Content Repo','',false),
  ('github_content_branch','main','api_keys','Learn Content Branch','',false),
  ('learn_content_model','','general','Learn Content LLM Model','',false)
ON CONFLICT (key) DO NOTHING;

-- Charts auto_insights
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS auto_insights jsonb;

-- Saved readings
CREATE TABLE IF NOT EXISTS public.saved_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES public.charts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'single',
  gurus text[] NOT NULL DEFAULT '{}',
  question text NOT NULL,
  answer jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS saved_readings_user_created_idx ON public.saved_readings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_readings_chart_created_idx ON public.saved_readings(chart_id, created_at DESC);
ALTER TABLE public.saved_readings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_readings' AND policyname='Users select own saved_readings') THEN
    CREATE POLICY "Users select own saved_readings" ON public.saved_readings FOR SELECT USING (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_readings' AND policyname='Users insert own saved_readings') THEN
    CREATE POLICY "Users insert own saved_readings" ON public.saved_readings FOR INSERT WITH CHECK (auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_readings' AND policyname='Users delete own saved_readings') THEN
    CREATE POLICY "Users delete own saved_readings" ON public.saved_readings FOR DELETE USING (auth.uid()=user_id);
  END IF;
END $$;

-- Social bot
CREATE TABLE IF NOT EXISTS public.social_feature_flags (
  key text PRIMARY KEY,
  label text, description text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.social_feature_flags (key,label,description,enabled) VALUES
  ('SOCIAL_BOT_TWITTER_ENABLED','Twitter/X Bot','',false),
  ('TWEET_SCHEDULER_ENABLED','Tweet Scheduler','',false),
  ('SOCIAL_BOT_REDDIT_ENABLED','Reddit Bot','',false)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_settings (
  id int PRIMARY KEY DEFAULT 1,
  twitter_enabled boolean NOT NULL DEFAULT false,
  max_per_day int NOT NULL DEFAULT 16,
  max_per_hour int NOT NULL DEFAULT 10,
  poll_interval_min int NOT NULL DEFAULT 15,
  default_city text NOT NULL DEFAULT 'Bharuch',
  default_lat double precision DEFAULT 21.7051,
  default_lon double precision DEFAULT 72.9959,
  default_tz text NOT NULL DEFAULT 'Asia/Kolkata',
  languages jsonb NOT NULL DEFAULT '["hi","en"]'::jsonb,
  include_link boolean NOT NULL DEFAULT false,
  fetch_metrics boolean NOT NULL DEFAULT false,
  last_poll_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_settings_singleton CHECK (id=1)
);
INSERT INTO public.social_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.scheduled_tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamptz NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('panchang','rashifal','transit','rashi_effect')),
  variant text, rashi text,
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted','failed','cancelled')),
  body text, thread jsonb, media_url text, tweet_id text,
  impressions int NOT NULL DEFAULT 0,
  likes int NOT NULL DEFAULT 0,
  error text,
  generated_by text NOT NULL DEFAULT 'auto' CHECK (generated_by IN ('auto','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);
CREATE INDEX IF NOT EXISTS scheduled_tweets_status_sched_idx ON public.scheduled_tweets(status, scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_tweets_auto_idem_idx ON public.scheduled_tweets(content_type, coalesce(variant,''), scheduled_at, coalesce(rashi,'')) WHERE generated_by='auto';

CREATE TABLE IF NOT EXISTS public.social_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  action text CHECK (action IN ('scheduler_tick','generate_week','generate','post_now','fetch_metrics')),
  result text CHECK (result IN ('ok','skipped','error')),
  detail jsonb
);
CREATE INDEX IF NOT EXISTS social_runs_ran_at_idx ON public.social_runs(ran_at DESC);

DROP TRIGGER IF EXISTS social_feature_flags_set_updated_at ON public.social_feature_flags;
CREATE TRIGGER social_feature_flags_set_updated_at BEFORE UPDATE ON public.social_feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS social_settings_set_updated_at ON public.social_settings;
CREATE TRIGGER social_settings_set_updated_at BEFORE UPDATE ON public.social_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS scheduled_tweets_set_updated_at ON public.scheduled_tweets;
CREATE TRIGGER scheduled_tweets_set_updated_at BEFORE UPDATE ON public.scheduled_tweets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.social_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_runs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
  is_admin constant text := 'EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role=''admin'')';
BEGIN
  FOREACH t IN ARRAY ARRAY['social_feature_flags','social_settings','scheduled_tweets','social_runs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins all %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Admins all %1$s" ON public.%1$s FOR ALL USING (%2$s) WITH CHECK (%2$s)', t, is_admin);
  END LOOP;
END $$;

INSERT INTO public.app_settings (key,value,category,label,description,is_secret) VALUES
  ('X_API_KEY','','api_keys','X API Key','',true),
  ('X_API_SECRET','','api_keys','X API Secret','',true),
  ('X_ACCESS_TOKEN','','api_keys','X Access Token','',true),
  ('X_ACCESS_SECRET','','api_keys','X Access Secret','',true),
  ('X_BEARER_TOKEN','','api_keys','X Bearer Token','',true)
ON CONFLICT (key) DO NOTHING;

-- GRANTs (Lovable Cloud requirement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transit_alerts TO authenticated;
GRANT ALL ON public.transit_alerts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_sessions TO authenticated;
GRANT ALL ON public.voice_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_email_sends TO authenticated;
GRANT ALL ON public.daily_email_sends TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_readings TO authenticated;
GRANT ALL ON public.saved_readings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_feature_flags TO authenticated;
GRANT ALL ON public.social_feature_flags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_settings TO authenticated;
GRANT ALL ON public.social_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_tweets TO authenticated;
GRANT ALL ON public.scheduled_tweets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_runs TO authenticated;
GRANT ALL ON public.social_runs TO service_role;