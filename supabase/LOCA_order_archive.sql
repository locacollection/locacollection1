-- LOCA COLLECTION admin order archive and customer visibility repair
-- Safe to run more than once on the same Supabase project.

begin;

-- The RLS policy already limits customer rows to their owner or an admin.
-- The table-level grant was missing, which made the Studio show real orders as guests.
revoke all on table public.customers from anon;
revoke all on table public.customers from authenticated;
grant select on table public.customers to authenticated;

-- Keep live-order privileges narrow. Checkout writes through place_order(), while
-- customers only read their own rows and admins receive delete access through RLS.
revoke all on table public.orders from anon;
revoke all on table public.orders from authenticated;
grant select, delete on table public.orders to authenticated;
grant update (
  status,
  payment_status,
  cancelled_by,
  cancellation_reason,
  cancellation_note
) on table public.orders to authenticated;

drop policy if exists admin_delete_orders on public.orders;
create policy admin_delete_orders
on public.orders for delete
to authenticated
using ((select public.is_admin()));

create table if not exists public.archived_orders (
  id uuid primary key default gen_random_uuid(),
  original_order_id uuid not null unique,
  order_number text not null,
  user_id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  payment_method text,
  status text,
  payment_status text,
  total integer not null default 0,
  ordered_at timestamptz,
  archived_at timestamptz not null default now(),
  archived_by uuid,
  archive_reason text,
  items jsonb not null default '[]'::jsonb,
  customer_actions jsonb not null default '[]'::jsonb,
  order_snapshot jsonb not null default '{}'::jsonb,
  constraint archived_orders_reason_length
    check (archive_reason is null or char_length(archive_reason) <= 500),
  constraint archived_orders_items_array
    check (jsonb_typeof(items) = 'array'),
  constraint archived_orders_actions_array
    check (jsonb_typeof(customer_actions) = 'array'),
  constraint archived_orders_snapshot_object
    check (jsonb_typeof(order_snapshot) = 'object')
);

create index if not exists archived_orders_archived_at_idx
  on public.archived_orders(archived_at desc);
create index if not exists archived_orders_order_number_idx
  on public.archived_orders(order_number);
create index if not exists archived_orders_user_id_idx
  on public.archived_orders(user_id);

alter table public.archived_orders enable row level security;

drop policy if exists archived_orders_admin_select on public.archived_orders;
create policy archived_orders_admin_select
on public.archived_orders for select
to authenticated
using ((select public.is_admin()));

drop policy if exists archived_orders_admin_insert on public.archived_orders;
create policy archived_orders_admin_insert
on public.archived_orders for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists archived_orders_admin_delete on public.archived_orders;
create policy archived_orders_admin_delete
on public.archived_orders for delete
to authenticated
using ((select public.is_admin()));

revoke all on table public.archived_orders from anon;
revoke all on table public.archived_orders from authenticated;
grant select, insert, delete on table public.archived_orders to authenticated;
grant select, insert, update, delete on table public.archived_orders to service_role;

create or replace function public.admin_archive_order(
  p_order_id uuid,
  p_reason text default null
)
returns public.archived_orders
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_archive public.archived_orders%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Admin authentication is required.';
  end if;

  if p_order_id is null then
    raise exception 'Choose a valid order.';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Archive note must be 500 characters or fewer.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'This order no longer exists in the live order book.';
  end if;

  select * into v_customer
  from public.customers
  where id = v_order.customer_id;

  insert into public.archived_orders (
    original_order_id,
    order_number,
    user_id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    customer_city,
    payment_method,
    status,
    payment_status,
    total,
    ordered_at,
    archived_by,
    archive_reason,
    items,
    customer_actions,
    order_snapshot
  )
  values (
    v_order.id,
    v_order.order_number,
    v_order.user_id,
    v_order.customer_id,
    v_customer.name,
    v_customer.email,
    v_customer.phone,
    v_customer.address,
    v_customer.city,
    v_order.payment_method,
    v_order.status,
    v_order.payment_status,
    v_order.total,
    v_order.created_at,
    auth.uid(),
    v_reason,
    coalesce(
      (select jsonb_agg(to_jsonb(item) order by item.id)
       from public.order_items item
       where item.order_id = v_order.id),
      '[]'::jsonb
    ),
    coalesce(
      (select jsonb_agg(to_jsonb(action) order by action.created_at)
       from public.order_customer_actions action
       where action.order_id = v_order.id),
      '[]'::jsonb
    ),
    jsonb_build_object(
      'order', to_jsonb(v_order),
      'customer', coalesce(to_jsonb(v_customer), '{}'::jsonb)
    )
  )
  returning * into v_archive;

  delete from public.orders where id = v_order.id;

  return v_archive;
end;
$$;

revoke all on function public.admin_archive_order(uuid, text) from public;
revoke all on function public.admin_archive_order(uuid, text) from anon;
grant execute on function public.admin_archive_order(uuid, text) to authenticated;

create or replace function public.admin_permanently_delete_archived_order(
  p_archive_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted_id uuid;
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Admin authentication is required.';
  end if;

  delete from public.archived_orders
  where id = p_archive_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'This archived order was not found.';
  end if;

  return v_deleted_id;
end;
$$;

revoke all on function public.admin_permanently_delete_archived_order(uuid) from public;
revoke all on function public.admin_permanently_delete_archived_order(uuid) from anon;
grant execute on function public.admin_permanently_delete_archived_order(uuid) to authenticated;

commit;

