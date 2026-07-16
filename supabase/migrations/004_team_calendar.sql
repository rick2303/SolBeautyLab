-- ============================================================
-- 004 · Permiso "Team calendar" (ver las agendas de todo el equipo)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Nuevo permiso: 'calendar_all'
--   · Por defecto lo tienen owner y receptionist.
--   · El owner puede dárselo o quitárselo a cualquiera desde Team → Manage.
-- ============================================================

-- Defaults por rol ahora incluyen 'calendar_all'
create or replace function default_modules(r user_role)
returns text[] language sql immutable as $$
  select case r
    when 'owner' then array['dashboard','calendar','clients','services','payments','expenses','team','reports','reminders','calendar_all']
    when 'receptionist' then array['dashboard','calendar','clients','services','payments','calendar_all']
    else array['dashboard','calendar','clients']
  end;
$$;

-- Lectura de citas gobernada por el permiso:
--   owner → todo · con 'calendar_all' → todo · si no → solo su propia agenda
drop policy if exists "appts read" on appointments;
create policy "appts read" on appointments for select to authenticated
  using (
    my_role() = 'owner'
    or staff_id = auth.uid()
    or has_module('calendar_all')
  );
