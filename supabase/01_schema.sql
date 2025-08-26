-- 01_schema.sql
-- Enums
create type order_status as enum (
  'draft','submitted','picking','checking','ready','delivered','received','cancelled'
);

create type priority_level as enum ('normal','urgente');

create type user_role as enum ('nurse','pharmacy','admin','auditor');

-- Tabelas base
create table if not exists rooms (
  id bigserial primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  room_id bigint references rooms(id),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists meds (
  id bigserial primary key,
  name text not null unique,
  unit text not null default 'un', -- ex.: un, ml, mg, g
  high_alert boolean not null default false, -- MAV
  active boolean not null default true
);

create table if not exists kits (
  id bigserial primary key,
  key text not null unique,  -- ex.: 'DIALISE_FAV', 'DIALISE_PC', 'DIALISE_CDL'
  name text not null,
  active boolean not null default true
);

create table if not exists kit_items (
  kit_id bigint not null references kits(id) on delete cascade,
  med_id bigint not null references meds(id) on delete restrict,
  qty numeric(12,3) not null,
  unit text not null default 'un',
  primary key (kit_id, med_id)
);

create table if not exists orders (
  id bigserial primary key,
  room_id bigint not null references rooms(id),
  status order_status not null default 'submitted',
  priority priority_level not null default 'normal',
  kit_key text references kits(key),
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  med_id bigint not null references meds(id),
  qty numeric(12,3) not null,
  unit text not null default 'un',
  high_alert boolean not null default false
);

create table if not exists order_events (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_orders_room_id on orders(room_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order_id on order_items(order_id);

-- Funções utilitárias de permissão
create or replace function has_role(p_uid uuid, p_role user_role)
returns boolean language sql stable as $$
  select exists(
    select 1 from profiles p
    where p.user_id = p_uid and p.role = p_role
  );
$$;

create or replace function same_room(p_uid uuid, p_room_id bigint)
returns boolean language sql stable as $$
  select exists(
    select 1 from profiles p
    where p.user_id = p_uid and p.room_id = p_room_id
  );
$$;

-- Trigger: high_alert em order_items conforme meds
create or replace function trg_set_high_alert()
returns trigger language plpgsql as $$
begin
  select m.high_alert into new.high_alert from meds m where m.id = new.med_id;
  return new;
end;$$;

drop trigger if exists t_briu_order_items_high_alert on order_items;
create trigger t_briu_order_items_high_alert
before insert or update on order_items
for each row execute function trg_set_high_alert();

-- Trigger: log de mudança de status
create or replace function trg_log_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into order_events(order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists t_bru_orders_status on orders;
create trigger t_bru_orders_status
before update on orders
for each row execute function trg_log_order_status();

-- RLS
alter table rooms enable row level security;
alter table profiles enable row level security;
alter table meds enable row level security;
alter table kits enable row level security;
alter table kit_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;

-- Policies: rooms (leitura geral autenticada)
create policy if not exists rooms_read_auth on rooms
for select using (auth.role() = 'authenticated');

-- profiles: cada usuário vê o próprio; admin vê todos; apenas admin cria/edita
create policy if not exists profiles_self_select on profiles
for select using (
  user_id = auth.uid() or has_role(auth.uid(),'admin')
);

create policy if not exists profiles_admin_insert on profiles
for insert with check (has_role(auth.uid(),'admin'));

create policy if not exists profiles_admin_update on profiles
for update using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- meds/kits/kit_items: leitura geral autenticada; gravação por farmácia/admin
create policy if not exists meds_read on meds
for select using (auth.role() = 'authenticated');
create policy if not exists meds_write on meds
for all using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy'));

create policy if not exists kits_read on kits
for select using (auth.role() = 'authenticated');
create policy if not exists kits_write on kits
for all using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy'));

create policy if not exists kit_items_read on kit_items
for select using (auth.role() = 'authenticated');
create policy if not exists kit_items_write on kit_items
for all using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy'));

-- orders: 
-- select: enfermeiro só vê sua sala; farmácia/admin/auditor veem tudo
create policy if not exists orders_select_room_or_roles on orders
for select using (
  same_room(auth.uid(), room_id) or has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or has_role(auth.uid(),'auditor')
);

-- insert: enfermeiro pode criar para sua sala; farmácia/admin também
create policy if not exists orders_insert_room_or_roles on orders
for insert with check (
  same_room(auth.uid(), room_id) or has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy')
);

-- update: farmácia/admin podem atualizar; enfermeiro apenas se for criador e ainda em rascunho/submetido
create or replace function is_nurse_edit_allowed(old_status order_status)
returns boolean language sql immutable as $$
  select old_status in ('draft','submitted');
$$;

create policy if not exists orders_update_roles_or_owner on orders
for update using (
  has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or (created_by = auth.uid() and is_nurse_edit_allowed(status))
) with check (
  has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or (created_by = auth.uid() and is_nurse_edit_allowed(status))
);

-- order_items: visibilidade igual ao pedido; gravação por farmácia/admin ou enfermeiro enquanto permitido
create policy if not exists order_items_select on order_items
for select using (
  exists (
    select 1 from orders o
    where o.id = order_items.order_id and (
      same_room(auth.uid(), o.room_id) or has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or has_role(auth.uid(),'auditor')
    )
  )
);

create policy if not exists order_items_write on order_items
for all using (
  exists (
    select 1 from orders o
    where o.id = order_items.order_id and (
      has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or (o.created_by = auth.uid() and is_nurse_edit_allowed(o.status))
    )
  )
) with check (
  exists (
    select 1 from orders o
    where o.id = order_items.order_id and (
      has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or (o.created_by = auth.uid() and is_nurse_edit_allowed(o.status))
    )
  )
);

-- order_events: leitura por quem vê o pedido; insert por farmácia/admin
create policy if not exists order_events_select on order_events
for select using (
  exists (
    select 1 from orders o
    where o.id = order_events.order_id and (
      same_room(auth.uid(), o.room_id) or has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or has_role(auth.uid(),'auditor')
    )
  )
);

create policy if not exists order_events_insert_roles on order_events
for insert with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy'));
