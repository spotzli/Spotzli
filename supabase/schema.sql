-- Spotzi: Datenbank-Schema für Supabase
-- Einmal komplett im Supabase SQL Editor ausführen (Run).

-- Haushalte -------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unser Zuhause',
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slot text not null check (slot in ('sevi','sie')),   -- 'sevi' = Ersteller (mit Filmen), 'sie' = eingeladene Person
  filmen boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (household_id, slot)
);

-- Alle Inhalte (Termine, To-dos, Haushalt, Einkauf, Notizen, Einstellungen)
create table if not exists public.items (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null,                     -- event | todo | chore | chorelog | shop | recent | note | prefs
  visibility text not null check (visibility in ('private','shared')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists items_household_idx on public.items(household_id, updated_at);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
  for each row execute function public.touch_updated_at();

-- Hilfsfunktion: bin ich Mitglied?
create or replace function public.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where household_id = hh and user_id = auth.uid());
$$;

-- Zugriffsregeln (Row Level Security) ----------------------------------
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;

drop policy if exists hh_select on public.households;
create policy hh_select on public.households for select using (public.is_member(id));

drop policy if exists mem_select on public.members;
create policy mem_select on public.members for select using (public.is_member(household_id));
drop policy if exists mem_update_self on public.members;
create policy mem_update_self on public.members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private Einträge sieht nur, wer sie angelegt hat. Gemeinsame sehen alle Mitglieder.
drop policy if exists items_select on public.items;
create policy items_select on public.items for select
  using (public.is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid()));
drop policy if exists items_insert on public.items;
create policy items_insert on public.items for insert
  with check (public.is_member(household_id) and owner_id = auth.uid());
drop policy if exists items_update on public.items;
create policy items_update on public.items for update
  using (public.is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid()))
  with check (public.is_member(household_id) and owner_id = auth.uid());

-- Haushalt anlegen / beitreten ------------------------------------------
create or replace function public.create_household(p_name text, p_filmen boolean default true)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'Du bist bereits in einem Haushalt';
  end if;
  insert into public.households(created_by) values (auth.uid()) returning * into h;
  insert into public.members(household_id, user_id, name, slot, filmen) values (h.id, auth.uid(), p_name, 'sevi', p_filmen);
  return h;
end $$;

create or replace function public.join_household(p_code text, p_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into h from public.households where invite_code = upper(trim(p_code));
  if h.id is null then raise exception 'Einladungscode nicht gefunden'; end if;
  if exists (select 1 from public.members where household_id = h.id and user_id = auth.uid()) then return h; end if;
  if (select count(*) from public.members where household_id = h.id) >= 2 then
    raise exception 'Dieser Haushalt ist schon vollständig';
  end if;
  insert into public.members(household_id, user_id, name, slot, filmen) values (h.id, auth.uid(), p_name, 'sie', false);
  return h;
end $$;

grant execute on function public.create_household(text, boolean) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- Live-Sync einschalten
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Push-Nachrichten (ab Update 2)
-- =====================================================================
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Geräte, die Push-Nachrichten empfangen
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists ps_select on public.push_subs;
create policy ps_select on public.push_subs for select using (user_id = auth.uid());

-- Interne Einstellungen (Schlüssel) und Versand-Protokoll: nur der Server liest das
create table if not exists public.push_config (key text primary key, value text not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config(key, value) values ('cron_secret', md5(random()::text || clock_timestamp()::text) || md5(random()::text)) on conflict (key) do nothing;
insert into public.push_config(key, value) values ('function_url', 'https://rpmyvbxjicipfqipawkw.supabase.co/functions/v1/smooth-task') on conflict (key) do nothing;

create table if not exists public.push_log (key text primary key, sent_at timestamptz not null default now());
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Gerät an- und abmelden (aus der App)
create or replace function public.register_push(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select household_id into hh from public.members where user_id = auth.uid() limit 1;
  if hh is null then raise exception 'Kein Haushalt'; end if;
  insert into public.push_subs(endpoint, user_id, household_id, p256dh, auth, ua)
  values (p_endpoint, auth.uid(), hh, p_p256dh, p_auth, p_ua)
  on conflict (endpoint) do update set user_id = excluded.user_id, household_id = excluded.household_id,
    p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua, created_at = now();
end $$;
create or replace function public.unregister_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
$$;
grant execute on function public.register_push(text, text, text, text) to authenticated;
grant execute on function public.unregister_push(text) to authenticated;

-- Server-Funktion aufrufen (Fehler werden ignoriert, damit Speichern nie blockiert)
create or replace function public.spozli_call_push(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare u text; k text;
begin
  select value into u from public.push_config where key = 'function_url';
  select value into k from public.push_config where key = 'cron_secret';
  perform net.http_post(url := u, body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-spozli-key', k));
exception when others then null;
end $$;
revoke execute on function public.spozli_call_push(jsonb) from public, anon, authenticated;

-- Neuer gemeinsamer Termin: die andere Person bekommt sofort eine Push
create or replace function public.items_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'event' and new.visibility = 'shared' and not new.deleted then
    perform public.spozli_call_push(jsonb_build_object('action', 'item', 'id', new.id));
  end if;
  return null;
end $$;
drop trigger if exists items_notify on public.items;
create trigger items_notify after insert on public.items for each row execute function public.items_notify();

-- Jede Minute prüfen, was fällig ist
do $$ begin perform cron.unschedule('spozli-push'); exception when others then null; end $$;
select cron.schedule('spozli-push', '* * * * *', $cron$select public.spozli_call_push('{"action":"tick"}'::jsonb)$cron$);

-- Mit bestehendem Konto per Code beitreten (ab Update 9)
create or replace function public.switch_household(p_code text, p_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households; old record; free_slot text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into h from public.households where invite_code = upper(trim(p_code));
  if h.id is null then raise exception 'Einladungscode nicht gefunden'; end if;
  if exists (select 1 from public.members where household_id = h.id and user_id = auth.uid()) then return h; end if;
  if (select count(*) from public.members where household_id = h.id) >= 2 then
    raise exception 'Dieser Haushalt ist schon vollständig';
  end if;
  update public.push_subs set household_id = h.id where user_id = auth.uid();  -- Push-Geräte mitnehmen
  -- bisherigen Haushalt verlassen
  for old in select household_id from public.members where user_id = auth.uid() loop
    if (select count(*) from public.members where household_id = old.household_id) <= 1 then
      delete from public.households where id = old.household_id;           -- alleine: Haushalt samt Einträgen löschen
    else
      delete from public.items where household_id = old.household_id and owner_id = auth.uid();
      delete from public.members where household_id = old.household_id and user_id = auth.uid();
    end if;
  end loop;
  free_slot := case when exists (select 1 from public.members where household_id = h.id and slot = 'sie') then 'sevi' else 'sie' end;
  insert into public.members(household_id, user_id, name, slot, filmen) values (h.id, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Partner'), free_slot, false);
  return h;
end $$;
grant execute on function public.switch_household(text, text) to authenticated;
