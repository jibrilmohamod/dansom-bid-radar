-- Raw listings saved by the morning ingest job (/api/ingest). The daily sweep scores the
-- unreviewed ones and copies the good ones into opportunities.

create table public.leads (
  source text not null,
  ext_id text not null,
  title text not null,
  org text,
  location text,
  posted text,
  deadline date,
  url text not null,
  extra jsonb not null default '{}',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  reviewed boolean not null default false,
  primary key (source, ext_id)
);
alter table public.leads enable row level security;

create or replace function public.radar_upsert_leads(p_key text, p_leads jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public._check_key(p_key);
  with incoming as (
    select * from jsonb_to_recordset(p_leads) as x(source text, ext_id text, title text, org text, location text, posted text, deadline date, url text, extra jsonb)
  ), ins as (
    insert into public.leads (source, ext_id, title, org, location, posted, deadline, url, extra)
    select source, ext_id, title, org, location, posted, deadline, url, coalesce(extra, '{}') from incoming
    where source is not null and ext_id is not null and title is not null and url is not null
    on conflict (source, ext_id) do update set last_seen = now(),
      deadline = coalesce(excluded.deadline, public.leads.deadline)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted) into n from ins;
  return n;
end $$;
revoke all on function public.radar_upsert_leads(text, jsonb) from public;
grant execute on function public.radar_upsert_leads(text, jsonb) to anon, authenticated;
