-- 05_user_profile_management.sql
-- Permite que usuários criem/atualizem seus próprios perfis com sala

-- Função RPC para criar ou atualizar perfil do usuário
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
    p_room_id BIGINT,
    p_display_name TEXT DEFAULT NULL,
    p_role user_role DEFAULT 'nurse'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_existing_profile profiles%ROWTYPE;
    v_room_exists BOOLEAN;
BEGIN
    -- Verificar se o usuário está autenticado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuário não autenticado'
        );
    END IF;

    -- Verificar se a sala existe e está ativa
    SELECT EXISTS(
        SELECT 1 FROM rooms 
        WHERE id = p_room_id AND active = true
    ) INTO v_room_exists;
    
    IF NOT v_room_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Sala não encontrada ou inativa'
        );
    END IF;

    -- Verificar se já existe um perfil para este usuário
    SELECT * INTO v_existing_profile 
    FROM profiles 
    WHERE user_id = v_user_id;

    IF v_existing_profile.user_id IS NOT NULL THEN
        -- Atualizar perfil existente
        UPDATE profiles 
        SET 
            room_id = p_room_id,
            display_name = COALESCE(p_display_name, display_name),
            role = COALESCE(p_role, role),
            updated_at = NOW()
        WHERE user_id = v_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Perfil atualizado com sucesso',
            'action', 'updated'
        );
    ELSE
        -- Criar novo perfil
        INSERT INTO profiles (user_id, room_id, display_name, role)
        VALUES (
            v_user_id, 
            p_room_id, 
            COALESCE(p_display_name, 'Usuário'), 
            p_role
        );
        
        RETURN json_build_object(
            'success', true,
            'message', 'Perfil criado com sucesso',
            'action', 'created'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erro interno: ' || SQLERRM
        );
END;
$$;

-- Política RLS adicional para permitir que usuários criem seus próprios perfis
DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles
FOR INSERT WITH CHECK (
    user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Política RLS adicional para permitir que usuários atualizem seus próprios perfis
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
FOR UPDATE USING (
    user_id = auth.uid() OR has_role(auth.uid(), 'admin')
) WITH CHECK (
    user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Função auxiliar para obter salas ativas
CREATE OR REPLACE FUNCTION get_active_rooms()
RETURNS TABLE(
    id BIGINT,
    name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT r.id, r.name, r.created_at
    FROM rooms r
    WHERE r.active = true
    ORDER BY r.name;
$$;

-- Conceder permissões para executar as funções
GRANT EXECUTE ON FUNCTION create_or_update_user_profile(BIGINT, TEXT, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_rooms() TO authenticated;