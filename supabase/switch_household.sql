-- Spotzi: Mit bestehendem Konto per Einladungscode einem anderen Haushalt beitreten
-- Einmal im Supabase SQL Editor ausführen (Run). Kann gefahrlos mehrfach ausgeführt werden.
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
