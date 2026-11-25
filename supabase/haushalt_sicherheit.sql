-- Spotzi: Haushalte sicher trennen (Update 2026-11-25)
-- Einmal im Supabase SQL Editor ausführen (Run). Kann gefahrlos mehrfach ausgeführt werden.
-- Bestehende Haushalte, Mitglieder und Einträge bleiben unverändert.
-- Nur die Einladungscodes werden einmalig durch neue, längere Codes ersetzt.

-- 1) Längere Einladungscodes (8 Zeichen, ohne verwechselbare Zeichen wie 0/O, 1/I)
create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32 Zeichen
  b bytea; c text; i int;
begin
  loop
    b := uuid_send(gen_random_uuid());
    c := '';
    for i in 0..7 loop c := c || substr(abc, 1 + (get_byte(b, i) % 32), 1); end loop;
    exit when not exists (select 1 from public.households where invite_code = c);
  end loop;
  return c;
end $$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

alter table public.households alter column invite_code set default public.new_invite_code();
-- alte 6-stellige Codes einmalig ersetzen
update public.households set invite_code = public.new_invite_code() where length(invite_code) < 8;

-- 2) Fehlversuche beim Beitreten bremsen (max. 10 falsche Codes pro Stunde und Konto)
create table if not exists public.invite_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists invite_attempts_user_idx on public.invite_attempts(user_id, at);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from anon, authenticated;

-- Code suchen; null bei falschem Code oder zu vielen Versuchen (msg sagt, warum)
create or replace function public.find_invite(p_code text, out h public.households, out msg text)
language plpgsql security definer set search_path = public as $$
declare code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if (select count(*) from public.invite_attempts where user_id = auth.uid() and at > now() - interval '1 hour') >= 10 then
    msg := 'Zu viele falsche Codes. Bitte versuch es in einer Stunde nochmal.'; return;
  end if;
  select * into h from public.households where invite_code = code for update;
  if h.id is null then
    insert into public.invite_attempts(user_id) values (auth.uid());
    delete from public.invite_attempts where at < now() - interval '1 day';
    msg := 'Einladungscode nicht gefunden';
  end if;
end $$;
revoke execute on function public.find_invite(text) from public, anon, authenticated;

-- Beitreten (neues Konto). Antwort: {"ok":true} oder {"error":"..."}
drop function if exists public.join_household(text, text);
create function public.join_household(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'Nicht angemeldet'); end if;
  select * into f from public.find_invite(p_code);
  if f.msg is not null then return jsonb_build_object('error', f.msg); end if;
  if exists (select 1 from public.members where household_id = (f.h).id and user_id = auth.uid()) then return jsonb_build_object('ok', true); end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    return jsonb_build_object('error', 'Du bist bereits in einem Haushalt');
  end if;
  if (select count(*) from public.members where household_id = (f.h).id) >= 2 then
    return jsonb_build_object('error', 'Dieser Haushalt ist schon vollständig');
  end if;
  insert into public.members(household_id, user_id, name, slot, filmen)
  values ((f.h).id, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Partner'), 'sie', false);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.join_household(text, text) to authenticated;

-- Mit bestehendem Konto wechseln. Antwort: {"ok":true} oder {"error":"..."}
drop function if exists public.switch_household(text, text);
create function public.switch_household(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f record; old record; free_slot text;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'Nicht angemeldet'); end if;
  select * into f from public.find_invite(p_code);
  if f.msg is not null then return jsonb_build_object('error', f.msg); end if;
  if exists (select 1 from public.members where household_id = (f.h).id and user_id = auth.uid()) then return jsonb_build_object('ok', true); end if;
  if (select count(*) from public.members where household_id = (f.h).id) >= 2 then
    return jsonb_build_object('error', 'Dieser Haushalt ist schon vollständig');
  end if;
  update public.push_subs set household_id = (f.h).id where user_id = auth.uid();  -- Push-Geräte mitnehmen
  -- bisherigen Haushalt verlassen
  for old in select household_id from public.members where user_id = auth.uid() loop
    if (select count(*) from public.members where household_id = old.household_id) <= 1 then
      delete from public.households where id = old.household_id;           -- alleine: Haushalt samt Einträgen löschen
    else
      delete from public.items where household_id = old.household_id and owner_id = auth.uid();
      delete from public.members where household_id = old.household_id and user_id = auth.uid();
      -- 3) alter Code gilt nicht mehr, wer geht, kommt nicht mit dem alten Code zurück
      update public.households set invite_code = public.new_invite_code() where id = old.household_id;
    end if;
  end loop;
  free_slot := case when exists (select 1 from public.members where household_id = (f.h).id and slot = 'sie') then 'sevi' else 'sie' end;
  insert into public.members(household_id, user_id, name, slot, filmen)
  values ((f.h).id, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Partner'), free_slot, false);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.switch_household(text, text) to authenticated;

-- 3) Code selbst erneuern (Knopf in der App)
create or replace function public.renew_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare hh uuid; c text;
begin
  select household_id into hh from public.members where user_id = auth.uid() limit 1;
  if hh is null then raise exception 'Kein Haushalt'; end if;
  c := public.new_invite_code();
  update public.households set invite_code = c where id = hh;
  return c;
end $$;
grant execute on function public.renew_invite_code() to authenticated;

-- 4) Mitglieder dürfen bei sich selbst nur Name und Filmen ändern, nicht den Haushalt
revoke update on public.members from anon, authenticated;
grant update (name, filmen) on public.members to authenticated;
drop policy if exists mem_update_self on public.members;
create policy mem_update_self on public.members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- auch Anlegen/Löschen von Mitgliedern nur über die Funktionen oben
revoke insert, delete on public.members from anon, authenticated;
revoke insert, update, delete on public.households from anon, authenticated;
