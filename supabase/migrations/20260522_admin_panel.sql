-- ============================================================
-- Admin Panel Migration
-- Adds: role column on profiles, app_settings table, admin RPCs
-- ============================================================

-- 1a. Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- 1b. Create app_settings table
CREATE TABLE public.app_settings (
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

CREATE POLICY "Admins read app_settings" ON public.app_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins update app_settings" ON public.app_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins delete app_settings" ON public.app_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1c. Seed default settings
INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('GOOGLE_AI_KEY', '', 'api_keys', 'Google AI API Key', 'API key for Google AI Studio (Gemini). Get from https://aistudio.google.com/apikey', true),
  ('PDFSHIFT_API_KEY', '', 'api_keys', 'PDFShift API Key', 'API key for PDF report generation. Get from https://pdfshift.io', true),
  ('OPENROUTER_KEY', '', 'api_keys', 'OpenRouter API Key', 'Optional: API key for OpenRouter multi-model gateway. Get from https://openrouter.ai', true),
  ('llm_provider', 'google', 'llm_config', 'LLM Provider', 'Which AI provider to use for Guru Debate. Options: google, openrouter, openai', false),
  ('llm_model', 'gemini-2.5-flash', 'llm_config', 'LLM Model', 'Model identifier for the selected provider', false),
  ('llm_endpoint', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', 'llm_config', 'LLM API Endpoint', 'Full URL for the chat completions endpoint (OpenAI-compatible format)', false),
  ('llm_api_key_setting', 'GOOGLE_AI_KEY', 'llm_config', 'API Key Setting', 'Which API key setting to use (references an api_keys entry)', false)
ON CONFLICT (key) DO NOTHING;

-- 1d. RPC: admin_get_users
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  role text,
  ayanamsa text,
  chart_style text,
  house_system text,
  charts_count bigint,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
    SELECT
      au.id AS user_id,
      au.email::text,
      p.display_name,
      p.role,
      p.ayanamsa,
      p.chart_style,
      p.house_system,
      COALESCE(c.cnt, 0) AS charts_count,
      p.created_at,
      au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN (
      SELECT ch.user_id, COUNT(*) AS cnt FROM public.charts ch GROUP BY ch.user_id
    ) c ON c.user_id = au.id
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- 1e. RPC: admin_get_stats
CREATE OR REPLACE FUNCTION public.admin_get_stats()
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
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_charts', (SELECT COUNT(*) FROM public.charts),
    'users_today', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE),
    'charts_today', (SELECT COUNT(*) FROM public.charts WHERE created_at >= CURRENT_DATE),
    'users_this_week', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'charts_this_week', (SELECT COUNT(*) FROM public.charts WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;

-- 1f. RPC: get_app_settings_by_category (for edge functions via service role)
CREATE OR REPLACE FUNCTION public.get_app_settings_by_category(_category text)
RETURNS TABLE (key text, value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value FROM public.app_settings s WHERE s.category = _category;
$$;
