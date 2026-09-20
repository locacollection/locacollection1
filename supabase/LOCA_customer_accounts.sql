-- LOCA COLLECTION customer accounts + isolated carts + profiles + order ownership
-- Run this ONCE in Supabase Dashboard -> SQL Editor.
-- It keeps your existing products/orders/customers/order_items tables and existing place_order RPC.

begin;

-- 1) One profile row per Supabase Auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  address text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Automatically create/sync a profile when an Auth user is created or their email/name changes.
create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
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

-- Backfill profiles for any Auth users that already existed before this migration.
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do update
set email = excluded.email;

-- 2) One active cart per user, stored as rows by product.
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
using (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_insert_own on public.cart_items;
create policy cart_insert_own
on public.cart_items for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_update_own on public.cart_items;
create policy cart_update_own
on public.cart_items for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_delete_own on public.cart_items;
create policy cart_delete_own
on public.cart_items for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

revoke all on public.cart_items from anon;
grant select, insert, update, delete on public.cart_items to authenticated;

-- 3) Attach every NEW order to the currently signed-in Auth user.
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx on public.orders(user_id);

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

-- Customers can read only their own orders. Existing admin policies continue to work alongside this.
alter table public.orders enable row level security;
drop policy if exists customer_read_own_orders on public.orders;
create policy customer_read_own_orders
on public.orders for select
to authenticated
using (user_id = auth.uid());

-- Admins can change only the fulfilment status through the browser dashboard.
-- The table privilege and RLS policy are both required for Supabase Data API PATCH requests.
revoke update on table public.orders from anon;
revoke update on table public.orders from authenticated;
grant update (status) on table public.orders to authenticated;

drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders"
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Customers can read order items only for orders that belong to them.
alter table public.order_items enable row level security;
drop policy if exists customer_read_own_order_items on public.order_items;
create policy customer_read_own_order_items
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

-- 4) Optional link on your existing customers table for future admin/reporting use.
alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists customers_user_id_idx on public.customers(user_id);

-- Link existing customer/order history to existing Auth accounts when the email matches.
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

-- 5) The existing checkout RPC must never be callable by anonymous visitors.
revoke execute on function public.place_order(text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to authenticated;

commit;

-- QUICK TESTS AFTER RUNNING:
-- A) Open the storefront in Incognito. Checkout must require sign-in.
-- B) Create/sign in to Customer A, add a product, then sign in on another browser/device.
--    The same cart should load.
-- C) Sign out and sign in to Customer B. Customer A's cart/profile/orders must not appear.
-- D) Place an order as Customer A. It should appear under My Account -> Order history.
