-- 10_fix_orders_rls.sql
-- Corrigir políticas RLS para permitir acesso adequado aos pedidos

-- Remover políticas existentes para orders
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

-- Criar políticas mais permissivas para orders
-- Permitir que usuários autenticados vejam todos os pedidos
CREATE POLICY "orders_select_authenticated" ON public.orders
    FOR SELECT USING (auth.role() = 'authenticated');

-- Permitir que usuários autenticados criem pedidos
CREATE POLICY "orders_insert_authenticated" ON public.orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir que usuários autenticados atualizem pedidos
CREATE POLICY "orders_update_authenticated" ON public.orders
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir que usuários autenticados excluam pedidos (apenas admins)
CREATE POLICY "orders_delete_admin" ON public.orders
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Corrigir políticas para order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON public.order_items;

CREATE POLICY "order_items_select_authenticated" ON public.order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_insert_authenticated" ON public.order_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_items_update_authenticated" ON public.order_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_delete_authenticated" ON public.order_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Corrigir políticas para high_alert_checks
DROP POLICY IF EXISTS "high_alert_checks_select_policy" ON public.high_alert_checks;
DROP POLICY IF EXISTS "high_alert_checks_insert_policy" ON public.high_alert_checks;

CREATE POLICY "high_alert_checks_select_authenticated" ON public.high_alert_checks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "high_alert_checks_insert_authenticated" ON public.high_alert_checks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Corrigir políticas para order_events
DROP POLICY IF EXISTS "order_events_select_policy" ON public.order_events;
DROP POLICY IF EXISTS "order_events_insert_policy" ON public.order_events;

CREATE POLICY "order_events_select_authenticated" ON public.order_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "order_events_insert_authenticated" ON public.order_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Garantir que as tabelas tenham RLS habilitado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_alert_checks ENABLE ROW LEVEL SECURITY;

-- Verificar permissões nas tabelas
GRANT ALL PRIVILEGES ON public.orders TO authenticated;
GRANT ALL PRIVILEGES ON public.order_items TO authenticated;
GRANT ALL PRIVILEGES ON public.order_events TO authenticated;
GRANT ALL PRIVILEGES ON public.high_alert_checks TO authenticated;

-- Garantir permissões nas sequências
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Realtime já está habilitado para essas tabelas
-- Verificar se as tabelas estão na publicação realtime (já configurado)