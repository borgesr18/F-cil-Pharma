-- Migração para resolver 'Perfil sem sala vinculada'
-- Popula perfis de exemplo para usuários existentes

-- Inserir perfis de exemplo se não existirem
-- Nota: Substitua os UUIDs pelos IDs reais dos usuários criados no Auth

-- Verificar se existem usuários no auth.users e criar perfis básicos
DO $$
DECLARE
    user_record RECORD;
    room_count INTEGER;
BEGIN
    -- Verificar se existem salas
    SELECT COUNT(*) INTO room_count FROM rooms WHERE active = true;
    
    IF room_count = 0 THEN
        -- Criar salas básicas se não existirem
        INSERT INTO rooms (name, active) VALUES 
        ('UTI', true),
        ('Emergência', true),
        ('Enfermaria', true)
        ON CONFLICT (name) DO NOTHING;
    END IF;
    
    -- Para cada usuário no auth.users que não tem perfil, criar um perfil básico
    FOR user_record IN 
        SELECT au.id, au.email 
        FROM auth.users au 
        LEFT JOIN public.profiles p ON au.id = p.user_id 
        WHERE p.user_id IS NULL
    LOOP
        -- Criar perfil básico como enfermeiro na primeira sala disponível
        INSERT INTO profiles (user_id, role, display_name, room_id)
        SELECT 
            user_record.id,
            'nurse',
            COALESCE(split_part(user_record.email, '@', 1), 'Usuário'),
            (SELECT id FROM rooms WHERE active = true ORDER BY name LIMIT 1)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Perfil criado para usuário: %', user_record.email;
    END LOOP;
END $$;

-- Garantir que pelo menos um perfil admin existe
DO $$
DECLARE
    admin_count INTEGER;
    first_user_id UUID;
BEGIN
    -- Verificar se existe pelo menos um admin
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        -- Pegar o primeiro usuário e torná-lo admin
        SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            INSERT INTO profiles (user_id, role, display_name, room_id)
            VALUES (
                first_user_id,
                'admin',
                'Administrador',
                NULL  -- Admin não precisa de sala específica
            )
            ON CONFLICT (user_id) DO UPDATE SET
                role = 'admin',
                display_name = 'Administrador';
                
            RAISE NOTICE 'Perfil admin criado para o primeiro usuário';
        END IF;
    END IF;
END $$;