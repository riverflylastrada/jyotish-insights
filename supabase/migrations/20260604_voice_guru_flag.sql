-- ============================================================
-- Voice Guru availability flag (Admin → Voice toggle).
-- Default OFF so the feature ships as "Coming soon" until an
-- admin explicitly enables it. The voice-session edge function
-- treats anything but 'true' as disabled and refuses to mint an
-- ElevenLabs token while off, so no cost can be incurred.
-- Idempotent: ON CONFLICT DO NOTHING (won't clobber a later toggle).
-- ============================================================

INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('voice_guru_enabled', 'false', 'voice', 'Voice Guru — public availability',
   'true = live; anything else = Coming soon (no sessions, no ElevenLabs cost).', false)
ON CONFLICT (key) DO NOTHING;
