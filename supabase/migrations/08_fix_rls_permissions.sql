-- Garantir que todas as tabelas tenham RLS habilitado
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_alert_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para o role anon
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT ON public.meds TO anon;
GRANT SELECT ON public.kits TO anon;
GRANT SELECT ON public.kit_items TO anon;
GRANT SELECT ON public.sla_config TO anon;

-- Conceder permissões completas para o role authenticated
GRANT ALL PRIVILEGES ON public.rooms TO authenticated;
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.meds TO authenticated;
GRANT ALL PRIVILEGES ON public.kits TO authenticated;
GRANT ALL PRIVILEGES ON public.kit_items TO authenticated;
GRANT ALL PRIVILEGES ON public.orders TO authenticated;
GRANT ALL PRIVILEGES ON public.order_items TO authenticated;
GRANT ALL PRIVILEGES ON public.order_events TO authenticated;
GRANT ALL PRIVILEGES ON public.high_alert_checks TO authenticated;
GRANT ALL PRIVILEGES ON public.sla_config TO authenticated;

-- Conceder permissões nas sequências
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Políticas RLS para tabela rooms
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
CREATE POLICY "rooms_select_policy" ON public.rooms
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;
CREATE POLICY "rooms_insert_policy" ON public.rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rooms_update_policy" ON public.rooms;
CREATE POLICY "rooms_update_policy" ON public.rooms
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rooms_delete_policy" ON public.rooms;
CREATE POLICY "rooms_delete_policy" ON public.rooms
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Políticas RLS para tabela meds
DROP POLICY IF EXISTS "meds_select_policy" ON public.meds;
CREATE POLICY "meds_select_policy" ON public.meds
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "meds_insert_policy" ON public.meds;
CREATE POLICY "meds_insert_policy" ON public.meds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "meds_update_policy" ON public.meds;
CREATE POLICY "meds_update_policy" ON public.meds
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "meds_delete_policy" ON public.meds;
CREATE POLICY "meds_delete_policy" ON public.meds
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela kits
DROP POLICY IF EXISTS "kits_select_policy" ON public.kits;
CREATE POLICY "kits_select_policy" ON public.kits
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "kits_insert_policy" ON public.kits;
CREATE POLICY "kits_insert_policy" ON public.kits
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kits_update_policy" ON public.kits;
CREATE POLICY "kits_update_policy" ON public.kits
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kits_delete_policy" ON public.kits;
CREATE POLICY "kits_delete_policy" ON public.kits
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela kit_items
DROP POLICY IF EXISTS "kit_items_select_policy" ON public.kit_items;
CREATE POLICY "kit_items_select_policy" ON public.kit_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "kit_items_insert_policy" ON public.kit_items;
CREATE POLICY "kit_items_insert_policy" ON public.kit_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kit_items_update_policy" ON public.kit_items;
CREATE POLICY "kit_items_update_policy" ON public.kit_items
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kit_items_delete_policy" ON public.kit_items;
CREATE POLICY "kit_items_delete_policy" ON public.kit_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela orders
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;
CREATE POLICY "orders_delete_policy" ON public.orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
CREATE POLICY "order_items_insert_policy" ON public.order_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
CREATE POLICY "order_items_update_policy" ON public.order_items
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_delete_policy" ON public.order_items;
CREATE POLICY "order_items_delete_policy" ON public.order_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para tabela order_events
DROP POLICY IF EXISTS "order_events_select_policy" ON public.order_events;
CREATE POLICY "order_events_select_policy" ON public.order_events
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_events_insert_policy" ON public.order_events;
CREATE POLICY "order_events_insert_policy" ON public.order_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas RLS para tabela high_alert_checks
DROP POLICY IF EXISTS "high_alert_checks_select_policy" ON public.high_alert_checks;
CREATE POLICY "high_alert_checks_select_policy" ON public.high_alert_checks
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "high_alert_checks_insert_policy" ON public.high_alert_checks;
CREATE POLICY "high_alert_checks_insert_policy" ON public.high_alert_checks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas RLS para tabela sla_config
DROP POLICY IF EXISTS "sla_config_select_policy" ON public.sla_config;
CREATE POLICY "sla_config_select_policy" ON public.sla_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sla_config_insert_policy" ON public.sla_config;
CREATE POLICY "sla_config_insert_policy" ON public.sla_config
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sla_config_update_policy" ON public.sla_config;
CREATE POLICY "sla_config_update_policy" ON public.sla_config
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sla_config_delete_policy" ON public.sla_config;
CREATE POLICY "sla_config_delete_policy" ON public.sla_config
    FOR DELETE USING (auth.role() = 'authenticated');

-- Criar função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 
    AND profiles.role = 'admin'
  );
$$;

-- Atualizar políticas para permitir operações admin
DROP POLICY IF EXISTS "admin_full_access_rooms" ON public.rooms;
CREATE POLICY "admin_full_access_rooms" ON public.rooms
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_full_access_meds" ON public.meds;
CREATE POLICY "admin_full_access_meds" ON public.meds
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_full_access_kits" ON public.kits;
CREATE POLICY "admin_full_access_kits" ON public.kits
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_full_access_kit_items" ON public.kit_items;
CREATE POLICY "admin_full_access_kit_items" ON public.kit_items
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_full_access_sla_config" ON public.sla_config;
CREATE POLICY "admin_full_access_sla_config" ON public.sla_config
    FOR ALL USING (public.is_admin());

-- Habilitar realtime para todas as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.high_alert_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kit_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_config;