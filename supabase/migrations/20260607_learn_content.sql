-- ============================================================
-- NOTE: versioned 20260607 (not 20260606) on purpose. It originally shared the
-- version 20260606 with 20260606_daily_email.sql, and Supabase keys applied
-- migrations by that version (unique PK) — so `supabase db push` failed on every
-- merge with "duplicate key ... (version)=(20260606) already exists", which is why
-- migrations had to be applied by hand. Keep this version unique.
--
-- Admin "Learn Content" authoring pipeline — config seeds.
-- The learn-content edge function reads these to draft articles (LLM) and
-- publish them to the learn.acharyajyotish.com repo via the GitHub API.
-- No new table; reuses app_settings (surfaced in Admin → API Keys).
-- Idempotent / re-runnable.
-- ============================================================

INSERT INTO public.app_settings (key, value, category, label, description, is_secret)
VALUES
  ('github_content_token',  '', 'api_keys',
   'GitHub Content Token',
   'Fine-grained PAT with Contents:Read/Write on the learn repo. Used to publish articles.', true),
  ('github_content_repo',   'Viewofmind/learn-acharyajyotish', 'api_keys',
   'Learn Content Repo',
   'owner/repo the learn articles are committed to.', false),
  ('github_content_branch', 'main', 'api_keys',
   'Learn Content Branch',
   'Branch to commit to (deploy_on_push deploys it).', false),
  ('learn_content_model',   '', 'general',
   'Learn Content LLM Model',
   'Optional model override for article drafting (e.g. a stronger model than the default). Blank = use the configured LLM model.', false)
ON CONFLICT (key) DO NOTHING;
