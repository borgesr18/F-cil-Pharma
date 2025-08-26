-- 02_seeds.sql
insert into rooms(name) values
  ('Sala 1'),('Sala 2'),('Sala 3'),('Sala 4')
  on conflict do nothing;

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

insert into kits(key, name) values
  ('DIALISE_FAV','Diálise FAV'),
  ('DIALISE_PC','Diálise PC'),
  ('DIALISE_CDL','Diálise CDL')
  on conflict do nothing;

with kfav as (
  select id as kit_id from kits where key='DIALISE_FAV'
), kpc as (
  select id as kit_id from kits where key='DIALISE_PC'
), kcdl as (
  select id as kit_id from kits where key='DIALISE_CDL'
)
insert into kit_items(kit_id, med_id, qty, unit)
select (select kit_id from kfav), m.id, x.qty, x.unit from meds m
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

insert into kit_items(kit_id, med_id, qty, unit)
select (select kit_id from kpc), m.id, x.qty, x.unit from meds m
join (values
  ('Gaze (folha)',10,'un'),
  ('Algodão',1,'un'),
  ('Seringa 3ml',2,'un'),
  ('Equipo',1,'un'),
  ('Soro Fisiológico 0,9% 500ml',2,'un'),
  ('Dialisador',1,'un')
) as x(name, qty, unit) on m.name = x.name
on conflict do nothing;

insert into kit_items(kit_id, med_id, qty, unit)
select (select kit_id from kcdl), m.id, x.qty, x.unit from meds m
join (values
  ('Gaze (folha)',10,'un'),
  ('Algodão',1,'un'),
  ('Seringa 3ml',2,'un'),
  ('Equipo',1,'un'),
  ('Soro Fisiológico 0,9% 500ml',2,'un'),
  ('Dialisador',1,'un')
) as x(name, qty, unit) on m.name = x.name
on conflict do nothing;

-- Exemplo: associar um usuário como enfermeiro da Sala 2 (troque o UUID)
-- insert into profiles(user_id, role, room_id, display_name)
-- values ('00000000-0000-0000-0000-000000000000','nurse', (select id from rooms where name='Sala 2'), 'Enf. Maria')
-- on conflict (user_id) do update set role=excluded.role, room_id=excluded.room_id;
