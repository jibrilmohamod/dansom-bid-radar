-- Dansom Bid Radar schema. Applied to the Supabase project on 9 Oct 2026.
-- Tables have RLS on and no policies, so the anon key can't touch them directly.
-- The app calls the security-definer functions below, which check a shared app key
-- stored in public.app_secret. Set it once:
--   insert into public.app_secret (id, key) values (1, '<BID_RADAR_APP_KEY>');

create table public.opportunities (
  id text primary key,
  title text not null,
  org text,
  donor text,
  country text not null check (country in ('Somalia','Kenya','Ethiopia','Regional')),
  place text,
  deadline date,
  fit text not null check (fit in ('strong','good','low')),
  score int not null check (score between 0 and 100),
  tags text[] not null default '{}',
  why text,
  ref text,
  source text,
  url text,
  kind text not null default 'firm' check (kind in ('firm','individual')),
  found_on date not null default current_date,
  status text not null default 'new' check (status in ('new','pursuing','skip','submitted')),
  status_note text,
  status_at timestamptz,
  created_at timestamptz not null default now()
);
create index opportunities_deadline_idx on public.opportunities (deadline);

create table public.sweep_runs (
  run_date date primary key,
  new_count int not null default 0,
  summary text,
  created_at timestamptz not null default now()
);

create table public.app_secret (
  id int primary key default 1 check (id = 1),
  key text not null
);

alter table public.opportunities enable row level security;
alter table public.sweep_runs enable row level security;
alter table public.app_secret enable row level security;

create or replace function public._check_key(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from public.app_secret where key = p_key) then
    raise exception 'invalid app key' using errcode = '28000';
  end if;
end $$;

create or replace function public.radar_opportunities(p_key text)
returns setof public.opportunities
language plpgsql security definer set search_path = public as $$
begin
  perform public._check_key(p_key);
  return query select * from public.opportunities order by score desc, deadline asc nulls last;
end $$;

create or replace function public.radar_runs(p_key text)
returns setof public.sweep_runs
language plpgsql security definer set search_path = public as $$
begin
  perform public._check_key(p_key);
  return query select * from public.sweep_runs order by run_date desc limit 14;
end $$;

create or replace function public.radar_set_status(p_key text, p_id text, p_status text, p_note text default null)
returns public.opportunities
language plpgsql security definer set search_path = public as $$
declare r public.opportunities;
begin
  perform public._check_key(p_key);
  update public.opportunities
     set status = p_status, status_note = coalesce(p_note, status_note), status_at = now()
   where id = p_id
  returning * into r;
  if r.id is null then raise exception 'not found'; end if;
  return r;
end $$;

revoke all on function public._check_key(text) from public, anon, authenticated;
revoke all on function public.radar_opportunities(text) from public;
revoke all on function public.radar_runs(text) from public;
revoke all on function public.radar_set_status(text, text, text, text) from public;
grant execute on function public.radar_opportunities(text) to anon, authenticated;
grant execute on function public.radar_runs(text) to anon, authenticated;
grant execute on function public.radar_set_status(text, text, text, text) to anon, authenticated;
