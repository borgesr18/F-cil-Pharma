-- 02_seeds_fixed.sql
-- Salas
insert into rooms(name) values
  ('Sala 1'),('Sala 2'),('Sala 3'),('Sala 4')
on conflict do nothing;

-- Medicamentos (inclui MAVs)
insert into meds(name, unit, high_alert) values
  ('Heparina', 'ml', true),
  ('Insulina Regular', 'un', true),
  ('Soro Fisiológico 0,9% 500ml', 'un', false),
  ('Equipo', 'un', false),
  ('Dialisador', 'un', false),
  ('Agulha FAV (par)', 'par', false),
  ('Algodão', 'un', false),
  ('Gaze (folha)', 'un', false),
  ('Seringa 3ml', 'un', false)
on conflict do nothing;

-- Kits
insert into kits(key, name) values
  ('DIALISE_FAV','Diálise FAV'),
  ('DIALISE_PC','Diálise PC'),
  ('DIALISE_CDL','Diálise CDL')
on conflict do nothing;

-- Itens do kit FAV
insert into kit_items(kit_id, med_id, qty, unit)
select (select id from kits where key='DIALISE_FAV') as kit_id,
       m.id, x.qty, x.unit
from meds m
join (values
  ('Agulha FAV (par)',1,'par'),
  ('Gaze (folha)',10,'un'),
  ('Algodão',1,'un'),
  ('Seringa 3ml',2,'un'),
  ('Equipo',1,'un'),
  ('Soro Fisiológico 0,9% 500ml',2,'un'),
  ('Dialisador',1,'un')
) as x(name, qty, unit) on m.name = x.name
on conflict do nothing;

-- Itens do kit PC
insert into kit_items(kit_id, med_id, qty, unit)
select (select id from kits where key='DIALISE_PC') as kit_id,
       m.id, x.qty, x.unit
from meds m
join (values
  ('Gaze (folha)',10,'un'),
  ('Algodão',1,'un'),
  ('Seringa 3ml',2,'un'),
  ('Equipo',1,'un'),
  ('Soro Fisiológico 0,9% 500ml',2,'un'),
  ('Dialisador',1,'un')
) as x(name, qty, unit) on m.name = x.name
on conflict do nothing;

-- Itens do kit CDL
insert into kit_items(kit_id, med_id, qty, unit)
select (select id from kits where key='DIALISE_CDL') as kit_id,
       m.id, x.qty, x.unit
from meds m
join (values
  ('Gaze (folha)',10,'un'),
  ('Algodão',1,'un'),
  ('Seringa 3ml',2,'un'),
  ('Equipo',1,'un'),
  ('Soro Fisiológico 0,9% 500ml',2,'un'),
  ('Dialisador',1,'un')
) as x(name, qty, unit) on m.name = x.name
on conflict do nothing;

-- Exemplos de perfis (troque os e-mails pelo que você criou em Auth → Users)
-- ENFERMEIRO da Sala 2
-- insert into profiles (user_id, role, room_id, display_name)
-- select u.id, 'nurse', (select id from rooms where name='Sala 2'), 'Enf. Maria'
-- from auth.users u
-- where u.email = 'enfermeira@exemplo.com'
-- on conflict (user_id) do update
-- set role=excluded.role, room_id=excluded.room_id, display_name=excluded.display_name;

-- FARMÁCIA
-- insert into profiles (user_id, role, display_name)
-- select u.id, 'pharmacy', 'Farmácia'
-- from auth.users u
-- where u.email = 'farmacia@exemplo.com'
-- on conflict (user_id) do update set role=excluded.role, display_name=excluded.display_name;

-- ADMIN
-- insert into profiles (user_id, role, display_name)
-- select u.id, 'admin', 'Administrador'
-- from auth.users u
-- where u.email = 'admin@exemplo.com'
-- on conflict (user_id) do update set role=excluded.role, display_name=excluded.display_name;
