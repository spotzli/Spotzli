-- Spozli: Datenbank-Schema für Supabase
-- Einmal komplett im Supabase SQL Editor ausführen (Run).

create extension if not exists pgcrypto;

-- Haushalte -------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unser Zuhause',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
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
