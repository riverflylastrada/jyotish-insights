-- ============================================================
-- Make ai_usage a true append-only analytics log: a usage row must
-- never be rejected because of referential integrity. Drop the FK
-- constraints on chart_id / user_id (they remain plain uuid columns).
--
-- Root cause this fixes: guru-debate logged chart_id for demo / unsaved /
-- shared charts that don't exist in public.charts, so every such insert
-- failed the FK silently (fire-and-forget warn only) and the AI-usage
-- dashboard stayed empty. Combined with the edge logger now nulling any
-- non-uuid chart_id/user_id, every usage row now lands.
--
-- Idempotent: drops whatever FK constraints currently exist on ai_usage.
-- ============================================================

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ai_usage'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.ai_usage DROP CONSTRAINT %I', c);
  END LOOP;
END$$;
