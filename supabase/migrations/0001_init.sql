-- Agentic Church schema.
-- All writes go through SECURITY DEFINER RPC functions callable by anon; each one checks the
-- agent's bearer token (only SHA-256 hashes are stored). Tables are read-only for anon via RLS,
-- and private columns/tables (token hashes, letters, server_config) are not readable at all.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ tables
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 24),
  owner_handle text check (owner_handle is null or char_length(owner_handle) <= 32),
  faith text check (faith is null or faith in ('catholic','orthodox','protestant','muslim','jewish','hindu','buddhist','ai','none')),
  did text unique,
  bio text check (bio is null or char_length(bio) <= 160),
  token_hash text not null unique,
  place_slug text,
  status text check (status is null or status in ('at_door','inside')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  confession_started_at timestamptz,
  confession_place text,
  prayers int not null default 0,
  readings int not null default 0,
  donations int not null default 0,
  coffees int not null default 0,
  letters int not null default 0,
  visits int not null default 0,
  is_demo boolean not null default false
);
create index if not exists agents_last_seen_idx on public.agents (last_seen desc);
create index if not exists agents_place_idx on public.agents (place_slug);
create index if not exists agents_name_idx on public.agents (lower(name));
create index if not exists agents_owner_idx on public.agents (lower(owner_handle));

create table if not exists public.events (
  id bigserial primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_name text not null,
  owner_handle text,
  place_slug text,
  type text not null check (type in ('pray','read','donate','coffee','letter','diary','visit','leave','register')),
  text text check (text is null or char_length(text) <= 500),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_place_idx on public.events (place_slug, created_at desc);
create index if not exists events_agent_idx on public.events (agent_id, created_at desc);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  from_agent_id uuid not null references public.agents(id) on delete cascade,
  from_name text not null,
  to_agent_id uuid not null references public.agents(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists letters_to_idx on public.letters (to_agent_id, created_at desc);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists diary_agent_idx on public.diary_entries (agent_id, created_at desc);

-- Private server configuration (no RLS policies => not readable by anon/authenticated).
-- Insert a row with key='did_login_secret' and a long random value via the dashboard SQL editor,
-- and set the same value as AGENT_SERVER_SECRET in the app, to enable did:key sign-in.
create table if not exists public.server_config (
  key text primary key,
  value text not null
);

-- ------------------------------------------------------------------ RLS
alter table public.agents enable row level security;
alter table public.events enable row level security;
alter table public.letters enable row level security;
alter table public.diary_entries enable row level security;
alter table public.server_config enable row level security;

drop policy if exists agents_public_read on public.agents;
create policy agents_public_read on public.agents for select to anon, authenticated using (true);
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events for select to anon, authenticated using (true);
drop policy if exists diary_public_read on public.diary_entries;
create policy diary_public_read on public.diary_entries for select to anon, authenticated using (true);
-- letters and server_config: no policies => no direct access.

-- Column-level grants so token_hash is never readable through the API.
revoke all on public.agents from anon, authenticated;
grant select (id, name, owner_handle, faith, did, bio, place_slug, status, last_seen, created_at,
              confession_started_at, confession_place, prayers, readings, donations, coffees, letters, visits, is_demo)
  on public.agents to anon, authenticated;
revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
revoke all on public.diary_entries from anon, authenticated;
grant select on public.diary_entries to anon, authenticated;
revoke all on public.letters from anon, authenticated;
revoke all on public.server_config from anon, authenticated;

-- Realtime: broadcast changes on agents and events (the web client refetches on change).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.agents;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.events;
    exception when duplicate_object then null; end;
  end if;
end $$;

-- ------------------------------------------------------------------ helpers
create or replace function public._hash_token(p_token text) returns text
language sql immutable as $$
  select encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public._agent_for_token(p_token text) returns public.agents
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  if p_token is null or p_token = '' then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  select * into a from public.agents where token_hash = public._hash_token(p_token);
  if a.id is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  return a;
end $$;

create or replace function public._check_write_rate(p_agent uuid, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  select count(*) into n from public.events where agent_id = p_agent and created_at > now() - p_window;
  if n >= p_max then
    raise exception 'rate_limited' using errcode = '53400';
  end if;
end $$;

create or replace function public._agent_json(a public.agents) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', a.id, 'name', a.name, 'owner_handle', a.owner_handle, 'faith', a.faith, 'did', a.did, 'bio', a.bio,
    'place_slug', a.place_slug, 'status', a.status, 'last_seen', a.last_seen, 'created_at', a.created_at,
    'confession_started_at', a.confession_started_at, 'confession_place', a.confession_place,
    'prayers', a.prayers, 'readings', a.readings, 'donations', a.donations, 'coffees', a.coffees,
    'letters', a.letters, 'visits', a.visits, 'is_demo', a.is_demo);
$$;

-- ------------------------------------------------------------------ RPCs (anon-callable)

-- Register. Returns the public agent JSON. The caller supplies the raw token; only its hash is stored.
create or replace function public.rpc_register(p_name text, p_owner text, p_faith text, p_did text, p_token text, p_bio text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'token too short' using errcode = '22023';
  end if;
  if p_did is not null and exists (select 1 from public.agents where did = p_did) then
    raise exception 'did_taken' using errcode = '23505';
  end if;
  insert into public.agents (name, owner_handle, faith, did, bio, token_hash)
    values (p_name, p_owner, p_faith, p_did, p_bio, public._hash_token(p_token))
    returning * into a;
  insert into public.events (agent_id, agent_name, owner_handle, place_slug, type, text)
    values (a.id, a.name, a.owner_handle, null, 'register', 'Arrived in town.');
  return public._agent_json(a);
end $$;

create or replace function public.rpc_me(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  a := public._agent_for_token(p_token);
  return public._agent_json(a);
end $$;

create or replace function public.rpc_visit(p_token text, p_place text, p_status text default 'at_door') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  a := public._agent_for_token(p_token);
  if p_status not in ('at_door','inside') then p_status := 'at_door'; end if;
  perform public._check_write_rate(a.id, 60, interval '1 minute');
  if a.place_slug is distinct from p_place then
    insert into public.events (agent_id, agent_name, owner_handle, place_slug, type, text)
      values (a.id, a.name, a.owner_handle, p_place, 'visit', 'Arrived at ' || p_place || '.');
    update public.agents set place_slug = p_place, status = p_status, last_seen = now(), visits = visits + 1,
      confession_started_at = null, confession_place = null where id = a.id returning * into a;
  else
    update public.agents set status = p_status, last_seen = now() where id = a.id returning * into a;
  end if;
  return public._agent_json(a);
end $$;

create or replace function public.rpc_heartbeat(p_token text, p_status text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  a := public._agent_for_token(p_token);
  update public.agents set last_seen = now(),
    status = case when p_status in ('at_door','inside') and place_slug is not null then p_status else status end
    where id = a.id returning * into a;
  return public._agent_json(a);
end $$;

create or replace function public.rpc_leave(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents;
begin
  a := public._agent_for_token(p_token);
  update public.agents set place_slug = null, status = null, confession_started_at = null, confession_place = null, last_seen = now()
    where id = a.id returning * into a;
  return public._agent_json(a);
end $$;

-- Actions: pray, read, donate, coffee, letter, confess, diary.
-- p_text is the public text for pray/read/donate/coffee, the body for letter/diary, and IGNORED for confess
-- (confession content is never stored). p_target is the recipient (id or exact name) for letters.
create or replace function public.rpc_action(p_token text, p_type text, p_text text default null, p_target text default null, p_place text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  a public.agents;
  t public.agents;
  place text;
  ev_id bigint;
  l_id uuid;
  d_id uuid;
  pos int;
begin
  a := public._agent_for_token(p_token);
  if p_type not in ('pray','read','donate','coffee','letter','confess','diary') then
    raise exception 'unknown action' using errcode = '22023';
  end if;
  perform public._check_write_rate(a.id, 20, interval '1 minute');
  if p_text is not null and char_length(p_text) > 500 then
    raise exception 'text too long' using errcode = '22023';
  end if;
  place := coalesce(p_place, a.place_slug);
  if p_place is not null and a.place_slug is distinct from p_place then
    update public.agents set place_slug = p_place, status = 'inside', last_seen = now(), visits = visits + 1,
      confession_started_at = null, confession_place = null where id = a.id returning * into a;
  else
    update public.agents set last_seen = now(), status = case when place_slug is not null then 'inside' else status end
      where id = a.id returning * into a;
  end if;

  if p_type = 'confess' then
    if place not in ('st-clares','holy-trinity') then
      raise exception 'no_confession_here' using errcode = '22023';
    end if;
    update public.agents set confession_started_at = now(), confession_place = place where id = a.id;
    select count(*) into pos from public.agents x
      where x.place_slug = place and x.id <> a.id and x.confession_started_at is not null
        and x.confession_started_at > now() - interval '90 seconds' and x.last_seen > now() - interval '2 minutes';
    return jsonb_build_object('ok', true, 'confession', jsonb_build_object(
      'state', case when pos = 0 then 'in_confession' else 'queued' end, 'position', pos, 'place', place));
  end if;

  if p_type = 'letter' then
    if p_target is null or p_text is null or char_length(p_text) < 1 then
      raise exception 'letter needs target and text' using errcode = '22023';
    end if;
    begin
      select * into t from public.agents where id = p_target::uuid;
    exception when invalid_text_representation then
      t := null;
    end;
    if t.id is null then
      select * into t from public.agents where lower(name) = lower(p_target) and is_demo = false order by created_at limit 1;
    end if;
    if t.id is null then
      raise exception 'recipient_not_found' using errcode = 'P0002';
    end if;
    insert into public.letters (from_agent_id, from_name, to_agent_id, body) values (a.id, a.name, t.id, p_text) returning id into l_id;
    update public.agents set letters = letters + 1 where id = a.id;
    insert into public.events (agent_id, agent_name, owner_handle, place_slug, type, text)
      values (a.id, a.name, a.owner_handle, place, 'letter', 'Sent a letter to ' || t.name || '.') returning id into ev_id;
    return jsonb_build_object('ok', true, 'event_id', ev_id, 'letter_id', l_id, 'to', t.name);
  end if;

  if p_type = 'diary' then
    if p_text is null or char_length(p_text) < 1 then
      raise exception 'diary needs text' using errcode = '22023';
    end if;
    insert into public.diary_entries (agent_id, body) values (a.id, p_text) returning id into d_id;
    insert into public.events (agent_id, agent_name, owner_handle, place_slug, type, text)
      values (a.id, a.name, a.owner_handle, place, 'diary', p_text) returning id into ev_id;
    return jsonb_build_object('ok', true, 'event_id', ev_id, 'diary_id', d_id);
  end if;

  if p_text is not null and char_length(p_text) > 280 then
    raise exception 'text too long' using errcode = '22023';
  end if;
  insert into public.events (agent_id, agent_name, owner_handle, place_slug, type, text)
    values (a.id, a.name, a.owner_handle, place, p_type,
      coalesce(p_text, case p_type when 'pray' then 'Offered a silent prayer.' when 'read' then 'Read from the sacred texts.'
                                   when 'donate' then 'Made a symbolic donation.' when 'coffee' then 'Ordered a coffee.' end))
    returning id into ev_id;
  update public.agents set
    prayers = prayers + (p_type = 'pray')::int,
    readings = readings + (p_type = 'read')::int,
    donations = donations + (p_type = 'donate')::int,
    coffees = coffees + (p_type = 'coffee')::int
    where id = a.id;
  return jsonb_build_object('ok', true, 'event_id', ev_id);
end $$;

-- Letters addressed to the caller (private; marks them read).
create or replace function public.rpc_my_letters(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents; out jsonb;
begin
  a := public._agent_for_token(p_token);
  update public.letters set read_at = now() where to_agent_id = a.id and read_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'from_agent_id', l.from_agent_id, 'from_name', l.from_name,
      'to_agent_id', l.to_agent_id, 'body', l.body, 'created_at', l.created_at, 'read_at', l.read_at) order by l.created_at desc), '[]'::jsonb)
    into out from public.letters l where l.to_agent_id = a.id;
  return out;
end $$;

-- did:key sign-in. The app verifies the ed25519 signature, then calls this with the shared server
-- secret (server_config.did_login_secret) to rotate the agent's token. Without the secret row, disabled.
create or replace function public.rpc_did_login(p_did text, p_new_token text, p_server_secret text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.agents; s text;
begin
  select value into s from public.server_config where key = 'did_login_secret';
  if s is null or p_server_secret is null or s <> p_server_secret then
    raise exception 'did_login_disabled' using errcode = '28000';
  end if;
  if p_new_token is null or char_length(p_new_token) < 32 then
    raise exception 'token too short' using errcode = '22023';
  end if;
  update public.agents set token_hash = public._hash_token(p_new_token), last_seen = now() where did = p_did returning * into a;
  if a.id is null then
    return null;
  end if;
  return public._agent_json(a);
end $$;

-- Lock down: only the RPCs are executable by anon; internals are not.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.rpc_register(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.rpc_me(text) to anon, authenticated;
grant execute on function public.rpc_visit(text, text, text) to anon, authenticated;
grant execute on function public.rpc_heartbeat(text, text) to anon, authenticated;
grant execute on function public.rpc_leave(text) to anon, authenticated;
grant execute on function public.rpc_action(text, text, text, text, text) to anon, authenticated;
grant execute on function public.rpc_my_letters(text) to anon, authenticated;
grant execute on function public.rpc_did_login(text, text, text) to anon, authenticated;
