-- Transit alerts table — stores detected transit/dasha events per chart
create table public.transit_alerts (
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

alter table public.transit_alerts enable row level security;

-- Users can read and mark-as-read their own alerts
create policy "Users select own alerts"
  on public.transit_alerts for select
  using (auth.uid() = user_id);

create policy "Users update own alerts"
  on public.transit_alerts for update
  using (auth.uid() = user_id);

-- Index for unread-count queries
create index idx_transit_alerts_user_unread
  on public.transit_alerts (user_id, read_at) where read_at is null;

-- Profile columns for notification preferences
alter table public.profiles
  add column if not exists transit_alerts_enabled boolean not null default true;

alter table public.profiles
  add column if not exists transit_alerts_categories text[] not null default '{all}';
