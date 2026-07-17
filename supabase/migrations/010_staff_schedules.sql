-- ============================================================
-- 010 · Horario semanal por miembro del staff
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Mismo formato que salon_settings.opening_hours:
--   { "mon": ["09:00","18:00"], "tue": ["09:00","18:00"], ..., "sun": null }
-- null (columna completa) = sin horario propio, aplican las horas del salón.
-- Un día en null o ausente = no trabaja ese día.
alter table profiles add column if not exists work_hours jsonb;

-- Sin política de UPDATE sobre profiles para el propio usuario: profiles
-- contiene "role" y una política por-fila permitiría a cualquier staff
-- escalar su propio rol. El guardado de work_hours pasa por una server
-- action con service_role que valida sesión y solo toca esta columna.
