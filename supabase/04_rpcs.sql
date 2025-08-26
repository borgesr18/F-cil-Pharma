-- RPCs adicionais usados pela aplicação

-- claim_order: atribui o pedido ao usuário atual se possível
create or replace function claim_order(p_order_id bigint)
returns jsonb language plpgsql security definer as $$
declare v_assigned text; v_status order_status; v_room bigint;
begin
  select assigned_to::text, status, room_id into v_assigned, v_status, v_room from orders where id = p_order_id for update;
  if v_status is null then return jsonb_build_object('success', false, 'error', 'Pedido inexistente'); end if;

  if v_assigned is not null then
    return jsonb_build_object('success', false, 'error', 'Pedido já atribuído');
  end if;

  if not (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or same_room(auth.uid(), v_room)) then
    return jsonb_build_object('success', false, 'error', 'Sem permissão');
  end if;

  update orders set assigned_to = auth.uid()::text, assigned_at = now() where id = p_order_id;
  return jsonb_build_object('success', true, 'assigned_to', auth.uid()::text);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;$$;

grant execute on function claim_order(bigint) to authenticated;

-- add_mav_check: registra checagem de medicamento de alto risco
create table if not exists high_alert_checks (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  checker_id uuid not null default auth.uid(),
  checked_at timestamptz not null default now(),
  notes text
);

alter table high_alert_checks enable row level security;

create policy if not exists high_alert_checks_select on high_alert_checks
for select using (
  exists (
    select 1 from orders o where o.id = high_alert_checks.order_id and (
      same_room(auth.uid(), o.room_id) or has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or has_role(auth.uid(),'auditor')
    )
  )
);

create policy if not exists high_alert_checks_insert on high_alert_checks
for insert with check (
  exists (
    select 1 from orders o where o.id = high_alert_checks.order_id and (
      has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or same_room(auth.uid(), o.room_id)
    )
  )
);

create or replace function add_mav_check(p_order_id bigint, p_notes text default null)
returns jsonb language plpgsql security definer as $$
begin
  insert into high_alert_checks(order_id, notes) values (p_order_id, p_notes);
  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;$$;

grant execute on function add_mav_check(bigint, text) to authenticated;

-- get_active_rooms: retorna lista de salas ativas
create or replace function get_active_rooms()
returns table(id bigint, name text) language sql stable security definer as $$
  select id, name from rooms where active = true order by name;
$$;

grant execute on function get_active_rooms() to authenticated;