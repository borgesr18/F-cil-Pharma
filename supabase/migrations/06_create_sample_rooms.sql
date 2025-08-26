-- 06_create_sample_rooms.sql
-- Criar salas de exemplo para o sistema

-- Inserir salas de exemplo
INSERT INTO rooms (name, active) VALUES 
('UTI - Unidade de Terapia Intensiva', true),
('Emergência', true),
('Enfermaria Clínica', true),
('Centro Cirúrgico', true),
('Pediatria', true),
('Cardiologia', true)
ON CONFLICT (name) DO NOTHING;

-- Verificar se as salas foram criadas
SELECT id, name, active, created_at FROM rooms WHERE active = true ORDER BY name;