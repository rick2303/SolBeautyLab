-- ============================================================
-- 007 · Zona horaria por defecto: Texas (America/Chicago)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

update salon_settings set timezone = 'America/Chicago';

alter table salon_settings
  alter column timezone set default 'America/Chicago';
