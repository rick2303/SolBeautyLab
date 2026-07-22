-- ============================================================
-- 021 · El staff también puede crear y editar clientas
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Antes: solo owner y recepción podían crear/editar clientas.
-- Ahora: el staff también (ya podían verlas con el módulo 'clients').
-- Borrar sigue siendo exclusivo del owner.
-- ============================================================

drop policy if exists "clients insert" on clients;
create policy "clients insert" on clients for insert to authenticated
  with check (my_role() in ('owner', 'receptionist', 'staff'));

drop policy if exists "clients update" on clients;
create policy "clients update" on clients for update to authenticated
  using (my_role() in ('owner', 'receptionist', 'staff'));
