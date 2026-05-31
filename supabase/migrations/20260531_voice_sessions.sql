-- ============================================================
-- Voice AI Guru Migration
-- Adds: voice_sessions table + RLS, admin_get_voice_stats RPC,
--       app_settings seeds for the single ElevenLabs agent + per-guru voices.
-- ============================================================

-- 1. voice_sessions: one row per completed ElevenLabs voice conversation
CREATE TABLE public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES public.charts(id) ON DELETE SET NULL,  -- null for demo / unsaved / no-chart
  guru_persona text NOT NULL DEFAULT 'parashara'
    CHECK (guru_persona IN (
      'parashara','saraswati','kp_master','jaimini',
      'varahamihira','mantreshwar','bhrigu','lalkitab'
    )),
  language text DEFAULT 'hi',
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  credits_consumed integer NOT NULL DEFAULT 0,
  conversation_id text,           -- ElevenLabs conversation id (for post-call reconciliation)
  transcript jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Owner-only access (mirrors transit_alerts / charts policy style)
CREATE POLICY "Users select own voice sessions"
  ON public.voice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own voice sessions"
  ON public.voice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own voice sessions"
  ON public.voice_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX voice_sessions_user_id_idx ON public.voice_sessions (user_id);
CREATE INDEX voice_sessions_created_at_idx ON public.voice_sessions (created_at);

-- 2. RPC: admin_get_voice_stats — gated on admin role (matches admin_get_stats pattern)
CREATE OR REPLACE FUNCTION public.admin_get_voice_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions', (SELECT COUNT(*) FROM public.voice_sessions),
    'total_minutes',  (SELECT COALESCE(ROUND(SUM(duration_seconds) / 60.0), 0) FROM public.voice_sessions),
    'sessions_today', (SELECT COUNT(*) FROM public.voice_sessions WHERE created_at >= CURRENT_DATE),
    'minutes_today',  (SELECT COALESCE(ROUND(SUM(duration_seconds) / 60.0), 0) FROM public.voice_sessions WHERE created_at >= CURRENT_DATE),
    'unique_users',   (SELECT COUNT(DISTINCT user_id) FROM public.voice_sessions),
    'by_guru', (
      SELECT COALESCE(jsonb_object_agg(guru_persona, cnt), '{}'::jsonb)
      FROM (SELECT guru_persona, COUNT(*) AS cnt FROM public.voice_sessions GROUP BY guru_persona) g
    ),
    'by_language', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(language, 'unknown'), cnt), '{}'::jsonb)
      FROM (SELECT language, COUNT(*) AS cnt FROM public.voice_sessions GROUP BY language) l
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_voice_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_voice_stats() TO authenticated;

-- 3a. Seed ElevenLabs secrets into app_settings (category 'api_keys', is_secret).
--     These surface in Admin → API Keys (masked) and are read server-side by the
--     voice edge functions via the service role — no `supabase secrets set` needed.
INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('ELEVENLABS_API_KEY', '', 'api_keys', 'ElevenLabs API Key', 'ElevenLabs account API key. Used server-side to mint conversation tokens / signed URLs. Get from https://elevenlabs.io (Profile → API Keys).', true),
  ('ELEVENLABS_WEBHOOK_SECRET', '', 'api_keys', 'ElevenLabs Webhook Secret', 'Shared secret sent as the X-Webhook-Secret header on each ElevenLabs tool call; verified by voice-tools. Use any long random string and set the same value on every tool in the agent.', true)
ON CONFLICT (key) DO NOTHING;

-- 3b. Seed voice config into app_settings (category 'voice').
--    Single base agent id + one voice id per persona (admin-editable, no redeploy needed).
INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('elevenlabs_agent_id', '', 'voice', 'ElevenLabs Agent ID', 'Single base ConvAI agent (tools + KB configured here). Voice + persona switch per session via overrides.', false),
  ('elevenlabs_default_guru', 'parashara', 'voice', 'Default Voice Guru', 'Persona used when none is selected. Must be one of the 8 voice guru keys.', false),
  ('elevenlabs_default_language', 'hi', 'voice', 'Default Voice Language', 'BCP-47 language code for the voice agent (e.g. hi, en).', false),
  ('voice_monthly_minutes_cap', '30', 'voice', 'Voice Minutes / Month (soft cap)', 'Advisory monthly minutes cap per user, reported by get-usage. Not billing.', false),
  ('elevenlabs_voice_id_parashara',    '', 'voice', 'Parashara Voice ID',    'ElevenLabs voice id for Parashara Muni (Shardul K).', false),
  ('elevenlabs_voice_id_saraswati',    '', 'voice', 'Saraswati Voice ID',    'ElevenLabs voice id for Devi Saraswati (Nikita).', false),
  ('elevenlabs_voice_id_kp_master',    '', 'voice', 'KP Master Voice ID',    'ElevenLabs voice id for KP Master (Raj).', false),
  ('elevenlabs_voice_id_jaimini',      '', 'voice', 'Jaimini Voice ID',      'ElevenLabs voice id for Jaimini Acharya (Chetan).', false),
  ('elevenlabs_voice_id_varahamihira', '', 'voice', 'Varahamihira Voice ID', 'ElevenLabs voice id for Varahamihira (Nishi).', false),
  ('elevenlabs_voice_id_mantreshwar',  '', 'voice', 'Mantreshwar Voice ID',  'ElevenLabs voice id for Mantreshwar (Tarun).', false),
  ('elevenlabs_voice_id_bhrigu',       '', 'voice', 'Bhrigu Voice ID',       'ElevenLabs voice id for Bhrigu Rishi (Jeet).', false),
  ('elevenlabs_voice_id_lalkitab',     '', 'voice', 'Lal Kitab Voice ID',    'ElevenLabs voice id for Lal Kitab Pandit (Gaurav).', false)
ON CONFLICT (key) DO NOTHING;
