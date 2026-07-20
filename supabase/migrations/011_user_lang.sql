-- ============================================================
-- 011 · Preferencia de idioma por usuario
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- null = sin preferencia guardada (se usa la cookie del navegador / inglés)
alter table profiles add column if not exists lang text
  check (lang in ('en', 'es'));
