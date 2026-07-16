-- ============================================================
-- SEED DEMO · Sol Beauty Lab
-- Genera datos realistas para demostraciones:
--   · 12 clientes (etiquetados 'Demo')
--   · ~4 meses de citas completadas con sus pagos
--   · Citas de HOY (completadas, en progreso y agendadas)
--   · Citas de los próximos 10 días
--   · 5 meses de gastos (renta, insumos, marketing, etc.)
--
-- Requisitos: haber corrido schema.sql + seed.sql (servicios)
--             y tener al menos 1 usuario activo en profiles.
-- Se puede correr varias veces (los clientes no se duplican).
--
-- PARA BORRAR TODO LO DEMO después de la presentación:
--   delete from payments  where client_id in (select id from clients where 'Demo' = any(tags));
--   delete from messages  where client_id in (select id from clients where 'Demo' = any(tags));
--   delete from appointments where client_id in (select id from clients where 'Demo' = any(tags));
--   delete from clients   where 'Demo' = any(tags);
--   delete from expenses  where created_by is null;
-- ============================================================

do $$
declare
  tz text;
  staff_ids uuid[];
  svc_ids uuid[];
  cli_ids uuid[];
  n_staff int; n_svc int; n_cli int;
  d int; h int; i int := 0; m int;
  the_day date;
  starts timestamptz;
  v_svc record;
  v_client uuid;
  v_staff uuid;
  v_appt uuid;
  methods payment_method[] := array['cash','card','zelle','venmo','card','cash','card']::payment_method[];
  hours int[] := array[9, 10, 11, 13, 14, 15, 16, 17];
begin
  select timezone into tz from salon_settings limit 1;
  if tz is null then tz := 'America/New_York'; end if;

  staff_ids := array(select id from profiles where is_active order by created_at);
  svc_ids   := array(select id from services where is_active order by name);
  n_staff := coalesce(array_length(staff_ids, 1), 0);
  n_svc   := coalesce(array_length(svc_ids, 1), 0);
  if n_staff = 0 then raise exception 'No hay profiles activos'; end if;
  if n_svc = 0 then raise exception 'No hay services — corre seed.sql primero'; end if;

  -- ---------- Clientes demo ----------
  insert into clients (full_name, phone, email, notes, tags) values
    ('Maya Ortiz',    '+13054129087', 'maya.o@email.com',    'Loves almond shape, soft neutrals. Sensitive to strong acetone.', array['Demo','VIP','Nails']),
    ('Jenna Ruiz',    '+17862203341', 'jenna.ruiz@email.com','Classic lashes, natural look. Books every 3 weeks. Use sensitive glue.', array['Demo','Lashes','Sensitive']),
    ('Andre Woods',   '+13057781120', 'andre.w@email.com',   'Skin fade, keep beard sharp. Usually Saturdays.', array['Demo','Barber','Regular']),
    ('Priya Nair',    '+19546018842', 'priya.n@email.com',   'Volume sets, dramatic. Often books ahead for events.', array['Demo','VIP','Lashes']),
    ('Dana Kim',      '+13053394471', 'dana.kim@email.com',  'Likes bright colors and nail art. Chatty — enjoys the experience.', array['Demo','Nails','Nail art']),
    ('Sofia Blanco',  '+17864552298', 'sofia.b@email.com',   'Referred by Priya. First classic lash set went well.', array['Demo','Lashes']),
    ('Leah Foster',   '+13058901177', 'leah.f@email.com',    'Low-maintenance — lash lift & tint every 6 weeks. Prefers mornings.', array['Demo','Lashes']),
    ('Carla Mendes',  '+19547126650', 'carla.m@email.com',   'Prefers short natural nails.', array['Demo','Nails']),
    ('Tomás Vega',    '+13052015534', 'tomas.v@email.com',   'Skin fade every 2 weeks. Quick in-and-out, no beard.', array['Demo','Barber']),
    ('Bianca Rossi',  '+17863349902', 'bianca.r@email.com',  'French tips, loves seasonal colors. Refers a lot of friends.', array['Demo','Nails','Referrer']),
    ('Nina Alvarez',  '+13056677001', 'nina.a@email.com',    'Gel fills every 3 weeks, always books with the same tech.', array['Demo','Nails']),
    ('Kevin Brooks',  '+17869920034', 'kevin.b@email.com',   'Beard & cut monthly. Likes hot towel finish.', array['Demo','Barber'])
  on conflict (phone) do nothing;

  cli_ids := array(select id from clients where 'Demo' = any(tags) order by created_at);
  n_cli := array_length(cli_ids, 1);

  -- ---------- Historial: ~4 meses de citas completadas + pagos ----------
  for d in reverse 120..1 loop
    the_day := current_date - d;
    continue when extract(dow from the_day) = 0;  -- domingos cerrado

    for h in 1..(2 + (d % 3)) loop                -- 2 a 4 citas por día
      i := i + 1;
      v_client := cli_ids[1 + (i % n_cli)];
      v_staff  := staff_ids[1 + (i % n_staff)];
      select id, price, duration_min into v_svc from services where id = svc_ids[1 + ((i * 3) % n_svc)];
      starts := (the_day + make_time(hours[1 + ((i * 5) % 8)], (i % 2) * 30, 0)) at time zone tz;

      insert into appointments (client_id, service_id, staff_id, starts_at, duration_min, price, status)
      values (v_client, v_svc.id, v_staff, starts, v_svc.duration_min, v_svc.price, 'completed')
      returning id into v_appt;

      -- ~1 de cada 12 fue no-show (sin pago)
      if i % 12 = 0 then
        update appointments set status = 'no_show' where id = v_appt;
      else
        insert into payments (appointment_id, client_id, amount, method, paid_at)
        values (v_appt, v_client, v_svc.price, methods[1 + (i % 7)], starts + interval '90 minutes');
      end if;
    end loop;
  end loop;

  -- ---------- HOY: mezcla de estados ----------
  for h in 1..5 loop
    i := i + 1;
    v_client := cli_ids[1 + (i % n_cli)];
    v_staff  := staff_ids[1 + (i % n_staff)];
    select id, price, duration_min into v_svc from services where id = svc_ids[1 + ((i * 3) % n_svc)];
    starts := (current_date + make_time(8 + h * 2, 0, 0)) at time zone tz;   -- 10,12,14,16,18

    insert into appointments (client_id, service_id, staff_id, starts_at, duration_min, price, status)
    values (v_client, v_svc.id, v_staff, starts, v_svc.duration_min, v_svc.price,
            case when h <= 2 then 'completed' when h = 3 then 'in_progress'
                 when h = 4 then 'confirmed' else 'scheduled' end::appointment_status)
    returning id into v_appt;

    if h <= 2 then
      insert into payments (appointment_id, client_id, amount, method, paid_at)
      values (v_appt, v_client, v_svc.price, methods[1 + (i % 7)], starts + interval '1 hour');
    end if;
  end loop;

  -- ---------- Próximos 10 días ----------
  for d in 1..10 loop
    the_day := current_date + d;
    continue when extract(dow from the_day) = 0;
    for h in 1..(2 + (d % 2)) loop
      i := i + 1;
      v_client := cli_ids[1 + (i % n_cli)];
      v_staff  := staff_ids[1 + (i % n_staff)];
      select id, price, duration_min into v_svc from services where id = svc_ids[1 + ((i * 3) % n_svc)];
      starts := (the_day + make_time(hours[1 + ((i * 5) % 8)], (i % 2) * 30, 0)) at time zone tz;

      insert into appointments (client_id, service_id, staff_id, starts_at, duration_min, price, status)
      values (v_client, v_svc.id, v_staff, starts, v_svc.duration_min, v_svc.price,
              case when i % 3 = 0 then 'confirmed' else 'scheduled' end::appointment_status);
    end loop;
  end loop;

  -- ---------- Gastos: últimos 5 meses ----------
  for m in reverse 4..0 loop
    the_day := date_trunc('month', current_date) - (m || ' months')::interval;

    insert into expenses (description, category, amount, expense_date) values
      ('Studio rent',            'rent',      1800, the_day),
      ('Electricity & water',    'utilities',  195 + (m * 12), the_day + 5),
      ('Gel polish restock',     'supplies',   240 + (m * 15), the_day + 2),
      ('Lash adhesive & trays',  'supplies',   320 - (m * 10), the_day + 8),
      ('Towels & disposables',   'supplies',    95, the_day + 14),
      ('Instagram ads',          'marketing',  180, the_day + 7);

    if m % 2 = 0 then
      insert into expenses (description, category, amount, expense_date)
      values ('Equipment & tools', 'equipment', 210 + (m * 25), the_day + 11);
    end if;
  end loop;

  raise notice 'Seed demo listo: % citas creadas, % clientes demo', i, n_cli;
end $$;
