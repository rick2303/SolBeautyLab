-- ============================================================
-- 012 · Mensaje genérico al staff cuando les agendan una cita
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Variables disponibles: {{staff}} {{client_name}} {{service}} {{date}} {{time}}
alter table salon_settings add column if not exists staff_booking_template text
  not null default 'Nueva cita: {{client_name}} · {{service}} · {{date}} a las {{time}}';
