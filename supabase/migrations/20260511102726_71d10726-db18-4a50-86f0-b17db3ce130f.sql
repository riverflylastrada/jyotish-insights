
-- profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  ayanamsa text not null default 'lahiri',
  chart_style text not null default 'north',
  house_system text not null default 'whole_sign',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users view own profile"   on public.profiles for select using (auth.uid() = user_id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users delete own profile" on public.profiles for delete using (auth.uid() = user_id);

-- charts table
create table public.charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_details jsonb not null,
  snapshot jsonb,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.charts enable row level security;
create index charts_user_id_idx on public.charts(user_id);
create index charts_share_token_idx on public.charts(share_token);

create policy "Owner views own charts"   on public.charts for select using (auth.uid() = user_id);
create policy "Owner inserts charts"     on public.charts for insert with check (auth.uid() = user_id);
create policy "Owner updates own charts" on public.charts for update using (auth.uid() = user_id);
create policy "Owner deletes own charts" on public.charts for delete using (auth.uid() = user_id);
-- Public can read via share token (token acts as the secret)
create policy "Public read by share token" on public.charts for select using (true);
-- ^ the share_token is itself a secret UUID; we filter client-side. To be stricter,
-- we expose a security-definer RPC below; the broad policy is removed in favour of it.
drop policy "Public read by share token" on public.charts;

create or replace function public.get_chart_by_share_token(_token uuid)
returns setof public.charts
language sql
stable
security definer
set search_path = public
as $$
  select * from public.charts where share_token = _token limit 1;
$$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger charts_set_updated_at before update on public.charts
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
