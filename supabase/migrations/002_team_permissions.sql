-- ============================================================
-- 002 · Permisos por módulo para el team
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- profiles.modules = lista de módulos que ese usuario puede ver.
-- NULL → usa los módulos por defecto de su rol.
-- El owner siempre tiene todos los módulos.
-- ============================================================

alter table profiles add column if not exists modules text[];

create or replace function default_modules(r user_role)
returns text[] language sql immutable as $$
  select case r
    when 'owner' then array['dashboard','calendar','clients','services','payments','expenses','team','reports','reminders']
    when 'receptionist' then array['dashboard','calendar','clients','services','payments']
    else array['dashboard','calendar','clients']
  end;
$$;

create or replace function my_modules()
returns text[] language sql stable security definer set search_path = public as $$
  select case
    when p.role = 'owner' then default_modules('owner')      -- owner: siempre todo
    else coalesce(p.modules, default_modules(p.role))
  end
  from profiles p where p.id = auth.uid();
$$;

create or replace function has_module(m text)
returns boolean language sql stable as $$
  select m = any(coalesce(my_modules(), '{}'));
$$;

-- ---------- RLS que ahora respeta los módulos asignados ----------

-- PAYMENTS: visible con módulo 'payments' (o 'reports' para leer)
drop policy if exists "payments read" on payments;
drop policy if exists "payments insert" on payments;
drop policy if exists "payments manage" on payments;
create policy "payments read" on payments for select to authenticated
  using (has_module('payments') or has_module('reports'));
create policy "payments insert" on payments for insert to authenticated
  with check (has_module('payments'));
create policy "payments update" on payments for update to authenticated
  using (my_role() = 'owner');

-- EXPENSES: con módulo 'expenses' (o 'reports' para leer)
drop policy if exists "expenses all" on expenses;
create policy "expenses read" on expenses for select to authenticated
  using (has_module('expenses') or has_module('reports'));
create policy "expenses insert" on expenses for insert to authenticated
  with check (has_module('expenses'));
create policy "expenses update" on expenses for update to authenticated
  using (has_module('expenses'));
create policy "expenses delete" on expenses for delete to authenticated
  using (has_module('expenses'));

-- REMINDERS: configurable con módulo 'reminders'
drop policy if exists "rem settings manage" on reminder_settings;
create policy "rem settings manage" on reminder_settings for update to authenticated
  using (has_module('reminders'));

-- SERVICES: gestión con módulo 'services' + rol owner/receptionist
drop policy if exists "services manage" on services;
create policy "services manage" on services for all to authenticated
  using (my_role() = 'owner' or (has_module('services') and my_role() = 'receptionist'))
  with check (my_role() = 'owner' or (has_module('services') and my_role() = 'receptionist'));
