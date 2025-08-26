-- 05_fix_rls_policies.sql
-- Correção simples: remover política que bloqueia UPDATEs

-- Remover a política que bloqueia completamente os UPDATEs
DROP POLICY IF EXISTS orders_no_direct_update ON orders;

-- Garantir permissões básicas para as novas tabelas
GRANT SELECT ON high_alert_checks TO anon, authenticated;
GRANT INSERT ON high_alert_checks TO authenticated;
GRANT SELECT ON sla_config TO anon, authenticated;

-- Garantir permissões para todas as tabelas principais
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT ON order_items TO authenticated;
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON meds TO anon, authenticated;
GRANT SELECT ON kits TO anon, authenticated;
GRANT SELECT ON kit_items TO anon, authenticated;
GRANT SELECT ON rooms TO anon, authenticated;