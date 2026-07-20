-- ============================================================
-- 013 · Forzar cambio de contraseña temporal en el primer ingreso
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

alter table profiles add column if not exists must_change_password boolean
  not null default false;
