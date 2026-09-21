-- LOCA COLLECTION accounts, synced carts, order workflow and delivery addresses
-- Run in Supabase Dashboard -> SQL Editor for a fresh or existing LOCA project.
-- This migration is idempotent and preserves existing products, customers and orders.

begin;

-- 1) One profile per Supabase Auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  contact_email text,
  full_name text,
  phone text,
  address text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists contact_email text;

update public.profiles
set contact_email = email
where nullif(trim(contact_email), '') is null
  and email is not null;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
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
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.sync_auth_user_profile();

insert into public.profiles (id, email, contact_email, full_name)
select
  id,
  email,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do update
set email = excluded.email,
    contact_email = coalesce(nullif(public.profiles.contact_email, ''), excluded.contact_email);

-- 2) One cloud cart per account.
create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists cart_items_user_id_idx on public.cart_items(user_id);
alter table public.cart_items enable row level security;

drop policy if exists cart_select_own on public.cart_items;
create policy cart_select_own
on public.cart_items for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists cart_insert_own on public.cart_items;
create policy cart_insert_own
on public.cart_items for insert
to authenticated
with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists cart_update_own on public.cart_items;
create policy cart_update_own
on public.cart_items for update
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()))
with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists cart_delete_own on public.cart_items;
create policy cart_delete_own
on public.cart_items for delete
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.cart_items from anon;
grant select, insert, update, delete on public.cart_items to authenticated;

-- 3) Order ownership, fulfilment, payment and cancellation workflow.
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists payment_status text default 'Unpaid',
  add column if not exists cancelled_by text,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_note text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists status_updated_at timestamptz default now();

update public.orders
set payment_status = coalesce(payment_status, 'Unpaid'),
    status_updated_at = coalesce(status_updated_at, created_at, now());

update public.orders
set cancelled_by = coalesce(cancelled_by, 'Admin'),
    cancellation_reason = coalesce(cancellation_reason, 'Other'),
    cancellation_note = coalesce(cancellation_note, 'Legacy cancellation migrated into the structured workflow.'),
    cancelled_at = coalesce(cancelled_at, status_updated_at, created_at, now())
where status = 'Cancelled';

update public.orders
set cancelled_by = null,
    cancellation_reason = null,
    cancellation_note = null,
    cancelled_at = null
where status <> 'Cancelled';

alter table public.orders
  alter column payment_status set default 'Unpaid',
  alter column payment_status set not null,
  alter column status_updated_at set default now(),
  alter column status_updated_at set not null;

alter table public.orders drop constraint if exists orders_status_allowed;
alter table public.orders add constraint orders_status_allowed
  check (status in (
    'Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped',
    'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'
  ));

alter table public.orders drop constraint if exists orders_payment_status_allowed;
alter table public.orders add constraint orders_payment_status_allowed
  check (payment_status in (
    'Unpaid', 'Payment Pending', 'Partially Paid', 'Paid', 'Failed', 'Refunded'
  ));

alter table public.orders drop constraint if exists orders_cancelled_by_allowed;
alter table public.orders add constraint orders_cancelled_by_allowed
  check (cancelled_by is null or cancelled_by in ('Customer', 'Admin', 'System'));

alter table public.orders drop constraint if exists orders_cancellation_reason_allowed;
alter table public.orders add constraint orders_cancellation_reason_allowed
  check (
    cancellation_reason is null or cancellation_reason in (
      'Customer requested',
      'Unable to contact customer',
      'Payment not received',
      'Duplicate order',
      'Incorrect address',
      'Item unavailable',
      'Delivery issue',
      'Suspected fraud',
      'Other'
    )
  );

alter table public.orders drop constraint if exists orders_cancellation_note_length;
alter table public.orders add constraint orders_cancellation_note_length
  check (cancellation_note is null or char_length(cancellation_note) <= 500);

alter table public.orders drop constraint if exists orders_cancellation_details_valid;
alter table public.orders add constraint orders_cancellation_details_valid
  check (
    (
      status = 'Cancelled'
      and cancelled_by is not null
      and cancellation_reason is not null
      and cancelled_at is not null
    )
    or
    (
      status <> 'Cancelled'
      and cancelled_by is null
      and cancellation_reason is null
      and cancellation_note is null
      and cancelled_at is null
    )
  );

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_status_idx on public.orders(payment_status);

create or replace function public.loca_set_order_user()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  if new.user_id is null then
    raise exception 'Customer sign in is required';
  end if;
  return new;
end;
$$;

drop trigger if exists loca_set_order_user on public.orders;
create trigger loca_set_order_user
before insert on public.orders
for each row execute procedure public.loca_set_order_user();

create or replace function public.loca_normalize_order_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.payment_status is distinct from old.payment_status
     or new.cancelled_by is distinct from old.cancelled_by
     or new.cancellation_reason is distinct from old.cancellation_reason
     or new.cancellation_note is distinct from old.cancellation_note then
    new.status_updated_at := now();
  end if;

  if new.status = 'Cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  else
    new.cancelled_by := null;
    new.cancellation_reason := null;
    new.cancellation_note := null;
    new.cancelled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists loca_normalize_order_workflow on public.orders;
create trigger loca_normalize_order_workflow
before insert or update on public.orders
for each row execute procedure public.loca_normalize_order_workflow();

alter table public.orders enable row level security;

drop policy if exists "Admin view orders" on public.orders;
drop policy if exists customer_read_own_orders on public.orders;
create policy customer_read_own_orders
on public.orders for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke update on table public.orders from anon;
revoke update on table public.orders from authenticated;
grant update (
  status,
  payment_status,
  cancelled_by,
  cancellation_reason,
  cancellation_note
) on table public.orders to authenticated;

drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders"
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Customers see line items only for their own orders.
alter table public.order_items enable row level security;
drop policy if exists "Admin view order items" on public.order_items;
drop policy if exists customer_read_own_order_items on public.order_items;
create policy customer_read_own_order_items
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

-- 4) Link customer records and existing history to Auth accounts.
alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists customers_user_id_idx on public.customers(user_id);

alter table public.customers enable row level security;
drop policy if exists "Admin view customers" on public.customers;
drop policy if exists customer_read_own_customer on public.customers;
create policy customer_read_own_customer
on public.customers for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

update public.customers c
set user_id = u.id
from auth.users u
where c.user_id is null
  and c.email is not null
  and lower(c.email) = lower(u.email);

update public.orders o
set user_id = c.user_id
from public.customers c
where o.user_id is null
  and o.customer_id = c.id
  and c.user_id is not null;

create or replace function public.loca_set_customer_user()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if new.user_id is null and auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists loca_set_customer_user on public.customers;
create trigger loca_set_customer_user
before insert on public.customers
for each row execute procedure public.loca_set_customer_user();

-- 5) Synced delivery address book.
create table if not exists public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  recipient_name text,
  phone text,
  address text not null,
  city text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_addresses drop constraint if exists delivery_addresses_label_length;
alter table public.delivery_addresses add constraint delivery_addresses_label_length
  check (char_length(label) between 1 and 40);

alter table public.delivery_addresses drop constraint if exists delivery_addresses_recipient_length;
alter table public.delivery_addresses add constraint delivery_addresses_recipient_length
  check (recipient_name is null or char_length(recipient_name) <= 120);

alter table public.delivery_addresses drop constraint if exists delivery_addresses_phone_length;
alter table public.delivery_addresses add constraint delivery_addresses_phone_length
  check (phone is null or char_length(phone) <= 40);

alter table public.delivery_addresses drop constraint if exists delivery_addresses_address_length;
alter table public.delivery_addresses add constraint delivery_addresses_address_length
  check (char_length(address) between 3 and 500);

alter table public.delivery_addresses drop constraint if exists delivery_addresses_city_length;
alter table public.delivery_addresses add constraint delivery_addresses_city_length
  check (char_length(city) between 1 and 100);

create index if not exists delivery_addresses_user_id_idx
  on public.delivery_addresses(user_id);

create unique index if not exists delivery_addresses_one_default_per_user_idx
  on public.delivery_addresses(user_id)
  where is_default;

create or replace function public.loca_touch_delivery_address()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists loca_touch_delivery_address on public.delivery_addresses;
create trigger loca_touch_delivery_address
before update on public.delivery_addresses
for each row execute procedure public.loca_touch_delivery_address();

alter table public.delivery_addresses enable row level security;

drop policy if exists delivery_addresses_select_own on public.delivery_addresses;
create policy delivery_addresses_select_own
on public.delivery_addresses for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists delivery_addresses_insert_own on public.delivery_addresses;
create policy delivery_addresses_insert_own
on public.delivery_addresses for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists delivery_addresses_update_own on public.delivery_addresses;
create policy delivery_addresses_update_own
on public.delivery_addresses for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists delivery_addresses_delete_own on public.delivery_addresses;
create policy delivery_addresses_delete_own
on public.delivery_addresses for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on public.delivery_addresses from anon;
grant select, insert, update, delete on public.delivery_addresses to authenticated;
grant select, insert, update, delete on public.delivery_addresses to service_role;

-- 6) Checkout is available only to authenticated customers.
revoke execute on function public.place_order(text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to authenticated;

commit;

-- QUICK TESTS:
-- A) Incognito checkout must require sign-in.
-- B) Signed-in cart and delivery addresses must follow the account across devices.
-- C) Customer A must never see Customer B's profile, cart, addresses or orders.
-- D) Admin can edit workflow fields, while normal customers cannot update orders.
-- E) Cancelled orders require a source and reason; other statuses clear cancellation details.
