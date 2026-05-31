-- Per-user default chart.
--
-- Lets a user mark one saved chart as their default so multi-chart users don't
-- have to re-select their kundli every time. Used by the no-chart Voice Guru
-- entries (nav / mobile "Voice"), which resolve: default chart -> latest chart
-- -> ask for birth details.
--
-- ON DELETE SET NULL: if the chosen chart is deleted, the default clears itself
-- (the no-chart flow then falls back to the latest chart, or asks for details).
-- profiles already has owner-scoped RLS (select/insert/update/delete), so a user
-- can set their own default; the UI only ever offers the user's own charts.

alter table public.profiles
  add column if not exists default_chart_id uuid references public.charts(id) on delete set null;

comment on column public.profiles.default_chart_id is
  'The user''s preferred default chart (Library → set as default). Cleared automatically if that chart is deleted. Used by the no-chart Voice Guru entries.';
