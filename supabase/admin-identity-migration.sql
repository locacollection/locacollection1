-- Run once in Supabase SQL Editor before using Admins Desk account creation.
begin;

alter table public.profiles add column if not exists role text not null default 'customer';
alter table public.profiles add column if not exists admin_identifier text;
create unique index if not exists profiles_admin_identifier_unique on public.profiles (admin_identifier) where role = 'admin';

create or replace function public.resequence_admin_identifiers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row record;
  sequence_number integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access is required.'; end if;
  for profile_row in select id from public.profiles where role = 'admin' order by created_at, id loop
    sequence_number := sequence_number + 1;
    update public.profiles set admin_identifier = 'ADMIN_LOCA' || sequence_number, updated_at = now() where id = profile_row.id;
  end loop;
end;
$$;

create or replace function public.assign_admin_identifier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(742019);
  if new.role = 'admin' and nullif(new.admin_identifier, '') is null then
    new.admin_identifier := 'ADMIN_LOCA' || (select count(*) + 1 from public.profiles where role = 'admin' and id <> new.id);
  elsif new.role <> 'admin' then
    new.admin_identifier := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_admin_identifier on public.profiles;
create trigger profiles_assign_admin_identifier
before insert or update of role, admin_identifier on public.profiles
for each row execute function public.assign_admin_identifier();

update public.profiles set role = coalesce(nullif(role, ''), 'customer');
select public.resequence_admin_identifiers();

revoke all on function public.resequence_admin_identifiers() from public;
grant execute on function public.resequence_admin_identifiers() to authenticated;
commit;
