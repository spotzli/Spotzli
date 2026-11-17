-- Spotzi: Einkaufsliste – gesammelte Push-Nachricht an die andere Person (ab Update 10)
-- Einmal im Supabase SQL Editor ausführen (Run). Kann gefahrlos mehrfach ausgeführt werden.
create table if not exists public.shop_changes (
  id bigserial primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('add','done','edit')),
  name text not null,
  at timestamptz not null default now()
);
alter table public.shop_changes enable row level security;
revoke all on public.shop_changes from anon, authenticated;

create or replace function public.shop_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare act text; who uuid := coalesce(auth.uid(), new.owner_id); nm text := coalesce(new.data->>'name', '');
begin
  if new.kind <> 'shop' or nm = '' then return null; end if;
  if tg_op = 'INSERT' then
    if not new.deleted then act := 'add'; end if;
  elsif not old.deleted and new.deleted then act := 'done';
  elsif old.deleted and not new.deleted then act := 'add';
  elsif not new.deleted and coalesce(old.data->>'spec', '') is distinct from coalesce(new.data->>'spec', '') then
    act := 'edit'; nm := nm || coalesce(nullif(' (' || (new.data->>'spec') || ')', ' ()'), '');
  end if;
  if act is not null then
    insert into public.shop_changes(household_id, user_id, action, name) values (new.household_id, who, act, nm);
  end if;
  return null;
end $$;
drop trigger if exists shop_log on public.items;
create trigger shop_log after insert or update on public.items for each row execute function public.shop_log();
