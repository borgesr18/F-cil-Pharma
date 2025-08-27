-- Corrigir políticas RLS para permitir operações CRUD para usuários autenticados

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."rooms";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."rooms";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."rooms";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."rooms";

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."meds";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."meds";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."meds";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."meds";

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."kits";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."kits";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."kits";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."kits";

-- Políticas para tabela ROOMS
CREATE POLICY "Enable read access for all users" ON "public"."rooms"
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."rooms"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON "public"."rooms"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON "public"."rooms"
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (true);

-- Políticas para tabela MEDS
CREATE POLICY "Enable read access for all users" ON "public"."meds"
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."meds"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON "public"."meds"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON "public"."meds"
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (true);

-- Políticas para tabela KITS
CREATE POLICY "Enable read access for all users" ON "public"."kits"
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."kits"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON "public"."kits"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON "public"."kits"
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (true);

-- Garantir que as permissões básicas estejam configuradas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comentário explicativo
COMMENT ON POLICY "Enable read access for all users" ON "public"."rooms" IS 'Permite leitura para todos os usuários (anon e authenticated)';
COMMENT ON POLICY "Enable insert for authenticated users only" ON "public"."rooms" IS 'Permite inserção apenas para usuários autenticados';
COMMENT ON POLICY "Enable update for authenticated users only" ON "public"."rooms" IS 'Permite atualização apenas para usuários autenticados';
COMMENT ON POLICY "Enable delete for authenticated users only" ON "public"."rooms" IS 'Permite exclusão apenas para usuários autenticados';