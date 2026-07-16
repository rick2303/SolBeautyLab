-- Catálogo inicial (del prototipo). Ejecutar una sola vez en el SQL Editor.
insert into service_categories (name, sort_order) values
  ('Nails', 0), ('Lashes', 1), ('Barber', 2)
on conflict (name) do nothing;

with cats as (select id, name from service_categories)
insert into services (category_id, name, price, duration_min)
select c.id, s.name, s.price, s.dur
from (values
  ('Nails',  'Gel full set',      55, 90),
  ('Nails',  'Gel fill',          40, 60),
  ('Nails',  'Dip powder',        50, 75),
  ('Nails',  'Classic manicure',  30, 45),
  ('Lashes', 'Classic full set', 120, 120),
  ('Lashes', 'Classic fill',      60, 75),
  ('Lashes', 'Volume full set',  160, 150),
  ('Lashes', 'Volume fill',       75, 90),
  ('Lashes', 'Lash lift & tint',  75, 60),
  ('Barber', 'Men''s cut',        35, 45),
  ('Barber', 'Beard & cut',       50, 60),
  ('Barber', 'Skin fade',         40, 45)
) as s(cat, name, price, dur)
join cats c on c.name = s.cat;
