-- Inserir configurações padrão de SLA se não existirem
INSERT INTO sla_config (priority, sla_minutes, warning_threshold_percent)
VALUES 
  ('normal', 60, 80),    -- 1 hora para prioridade normal, alerta aos 80%
  ('urgente', 15, 70)    -- 15 minutos para urgente, alerta aos 70%
ON CONFLICT (priority) DO NOTHING;

-- Garantir que as permissões estão corretas
GRANT SELECT ON sla_config TO anon, authenticated;