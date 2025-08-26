-- 04_enhanced_rpc_security.sql
-- Melhorias de segurança e RPC obrigatória para v0.1

-- 1. Tabela para dupla checagem MAV
CREATE TABLE IF NOT EXISTS high_alert_checks (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    checker_id UUID NOT NULL REFERENCES auth.users(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    UNIQUE(order_id, checker_id) -- Garante usuários diferentes
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_high_alert_checks_order_id ON high_alert_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_high_alert_checks_checker_id ON high_alert_checks(checker_id);

-- 2. Configuração de SLA por prioridade
CREATE TABLE IF NOT EXISTS sla_config (
    priority priority_level PRIMARY KEY,
    sla_minutes INTEGER NOT NULL,
    warning_threshold_percent INTEGER DEFAULT 80, -- 80% do SLA = amarelo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais de SLA
INSERT INTO sla_config (priority, sla_minutes) VALUES 
('normal', 120),    -- 2 horas
('urgente', 30)     -- 30 minutos
ON CONFLICT (priority) DO NOTHING;

-- 3. Adicionar campos para claim/lock de pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);

-- 4. Expandir auditoria em order_events
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 5. Função auxiliar para validar transições de status
CREATE OR REPLACE FUNCTION is_valid_status_transition(p_from order_status, p_to order_status)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE
        WHEN p_from = 'submitted' AND p_to IN ('picking', 'cancelled') THEN true
        WHEN p_from = 'picking' AND p_to IN ('checking', 'cancelled') THEN true
        WHEN p_from = 'checking' AND p_to IN ('ready', 'cancelled') THEN true
        WHEN p_from = 'ready' AND p_to IN ('delivered', 'cancelled') THEN true
        WHEN p_from = 'delivered' AND p_to = 'received' THEN true
        ELSE false
    END;
END;
$$;

-- 6. Função RPC melhorada para mudança de status
CREATE OR REPLACE FUNCTION set_order_status(
    p_order_id BIGINT, 
    p_to order_status,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
DECLARE 
    v_from order_status;
    v_room BIGINT;
    v_has_mav BOOLEAN;
    v_check_count INTEGER;
    v_result JSONB;
BEGIN
    -- Buscar pedido com lock
    SELECT status, room_id INTO v_from, v_room 
    FROM orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_from IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Pedido inexistente');
    END IF;

    -- Verificar permissões
    IF NOT (
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'pharmacy') OR 
        (same_room(auth.uid(), v_room) AND p_to IN ('submitted', 'cancelled'))
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para esta transição');
    END IF;

    -- Validar fluxo de status
    IF NOT is_valid_status_transition(v_from, p_to) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transição de status inválida');
    END IF;

    -- Verificar dupla checagem MAV para checking → ready
    IF v_from = 'checking' AND p_to = 'ready' THEN
        -- Verificar se tem itens MAV
        SELECT EXISTS(
            SELECT 1 FROM order_items oi 
            WHERE oi.order_id = p_order_id AND oi.high_alert = true
        ) INTO v_has_mav;
        
        IF v_has_mav THEN
            -- Contar checagens distintas
            SELECT COUNT(DISTINCT checker_id) INTO v_check_count
            FROM high_alert_checks 
            WHERE order_id = p_order_id;
            
            IF v_check_count < 2 THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'error', 'Dupla checagem MAV pendente',
                    'checks_count', v_check_count,
                    'required_checks', 2
                );
            END IF;
        END IF;
    END IF;

    -- Atualizar status
    UPDATE orders 
    SET status = p_to, updated_at = NOW()
    WHERE id = p_order_id;

    -- Log expandido
    INSERT INTO order_events (
        order_id, from_status, to_status, actor_id, reason, 
        ip_address, user_agent, metadata
    ) VALUES (
        p_order_id, v_from, p_to, auth.uid(), p_reason,
        inet_client_addr(), 
        COALESCE(current_setting('request.headers', true)::jsonb->>'user-agent', 'unknown'),
        p_metadata
    );

    RETURN jsonb_build_object('success', true, 'from', v_from, 'to', p_to);
END;
$$;

-- 7. Função para claim/lock de pedidos
CREATE OR REPLACE FUNCTION claim_order(p_order_id BIGINT)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
DECLARE
    v_current_status order_status;
    v_assigned_to UUID;
BEGIN
    -- Verificar se é pharmacy
    IF NOT has_role(auth.uid(), 'pharmacy') AND NOT has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas farmácia pode assumir pedidos');
    END IF;

    -- Lock e verificar status
    SELECT status, assigned_to INTO v_current_status, v_assigned_to
    FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_current_status != 'submitted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não está disponível para claim');
    END IF;

    IF v_assigned_to IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido já foi assumido por outro usuário');
    END IF;

    -- Assumir e mudar para picking
    UPDATE orders 
    SET assigned_to = auth.uid(), assigned_at = NOW(), status = 'picking'
    WHERE id = p_order_id;

    -- Log da ação
    INSERT INTO order_events (order_id, from_status, to_status, actor_id, reason)
    VALUES (p_order_id, 'submitted', 'picking', auth.uid(), 'Pedido assumido via claim');

    RETURN jsonb_build_object('success', true, 'assigned_to', auth.uid());
END;
$$;

-- 8. Função para dupla checagem MAV
CREATE OR REPLACE FUNCTION add_mav_check(
    p_order_id BIGINT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
DECLARE
    v_check_count INTEGER;
BEGIN
    -- Verificar se é pharmacy
    IF NOT has_role(auth.uid(), 'pharmacy') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas farmácia pode fazer checagem MAV');
    END IF;

    -- Inserir checagem (UNIQUE constraint previne duplicatas)
    INSERT INTO high_alert_checks (order_id, checker_id, notes)
    VALUES (p_order_id, auth.uid(), p_notes)
    ON CONFLICT (order_id, checker_id) DO NOTHING;

    -- Contar checagens
    SELECT COUNT(DISTINCT checker_id) INTO v_check_count
    FROM high_alert_checks WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'checks_count', v_check_count,
        'can_advance', v_check_count >= 2
    );
END;
$$;

-- 9. RLS para high_alert_checks
ALTER TABLE high_alert_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY high_alert_checks_select ON high_alert_checks
FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'pharmacy') OR 
    has_role(auth.uid(), 'auditor')
);

CREATE POLICY high_alert_checks_insert ON high_alert_checks
FOR INSERT WITH CHECK (has_role(auth.uid(), 'pharmacy'));

-- 10. RLS para sla_config
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_config_select ON sla_config
FOR SELECT USING (true); -- Todos podem ler configurações de SLA

CREATE POLICY sla_config_modify ON sla_config
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 11. Bloquear UPDATE direto em orders (apenas via RPC)
DROP POLICY IF EXISTS orders_update_roles_or_owner ON orders;

-- Política que bloqueia UPDATE direto
CREATE POLICY orders_no_direct_update ON orders
FOR UPDATE USING (false); -- Bloqueia UPDATE direto

-- 12. Grants para as novas funções
GRANT EXECUTE ON FUNCTION set_order_status(BIGINT, order_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_order(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_mav_check(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_status_transition(order_status, order_status) TO authenticated;