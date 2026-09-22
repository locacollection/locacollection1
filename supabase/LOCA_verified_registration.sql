-- LOCA COLLECTION verified registration lifecycle
-- A private Supabase Auth record may exist while a confirmation token is
-- pending, but no public LOCA profile is created until the email is verified.

begin;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  insert into public.profiles (id, email, contact_email, full_name, updated_at)
  values (
    new.id,
    new.email,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      contact_email = coalesce(nullif(public.profiles.contact_email, ''), excluded.contact_email),
      full_name = case
        when coalesce(public.profiles.full_name, '') = '' then excluded.full_name
        else public.profiles.full_name
      end,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists loca_sync_auth_profile on auth.users;
create trigger loca_sync_auth_profile
after insert or update of email, email_confirmed_at, raw_user_meta_data on auth.users
for each row execute procedure public.sync_auth_user_profile();

revoke all on function public.sync_auth_user_profile() from public;
revoke all on function public.sync_auth_user_profile() from anon;
revoke all on function public.sync_auth_user_profile() from authenticated;

drop policy if exists profiles_insert_own on public.profiles;
revoke insert on table public.profiles from anon;
revoke insert on table public.profiles from authenticated;

-- Remove any legacy public profile that belongs to an email address which has
-- not been verified. Related private Auth records remain available so their
-- confirmation link can still complete normally.
delete from public.profiles profile
using auth.users auth_user
where profile.id = auth_user.id
  and auth_user.email_confirmed_at is null;

-- Repair confirmed legacy accounts if a previous signup failed between Auth
-- confirmation and profile creation.
insert into public.profiles (id, email, contact_email, full_name)
select
  id,
  email,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
where email_confirmed_at is not null
on conflict (id) do update
set email = excluded.email,
    contact_email = coalesce(nullif(public.profiles.contact_email, ''), excluded.contact_email),
    full_name = case
      when coalesce(public.profiles.full_name, '') = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();

commit;
