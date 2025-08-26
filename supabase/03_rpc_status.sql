-- 03_rpc_status.sql (opcional)
create or replace function set_order_status(p_order_id bigint, p_to order_status)
returns void language plpgsql security definer as $$
declare v_from order_status; v_room bigint;
begin
  select status, room_id into v_from, v_room from orders where id = p_order_id for update;
  if v_from is null then raise exception 'Pedido inexistente'; end if;

  if not (has_role(auth.uid(),'admin') or has_role(auth.uid(),'pharmacy') or (same_room(auth.uid(), v_room) and p_to in ('submitted','cancelled'))) then
    raise exception 'Sem permissão para esta transição';
  end if;

  if v_from = 'submitted' and p_to not in ('picking','cancelled') then raise exception 'Transição inválida'; end if;
  if v_from = 'picking' and p_to <> 'checking' then raise exception 'Transição inválida'; end if;
  if v_from = 'checking' and p_to <> 'ready' then raise exception 'Transição inválida'; end if;
  if v_from = 'ready' and p_to <> 'delivered' then raise exception 'Transição inválida'; end if;
  if v_from = 'delivered' and p_to <> 'received' then raise exception 'Transição inválida'; end if;

  update orders set status = p_to where id = p_order_id;
end;$$;

grant execute on function set_order_status(bigint, order_status) to authenticated;
