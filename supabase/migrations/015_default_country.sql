-- ============================================================
-- 015 · País por defecto del salón (validación de teléfonos)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Código ISO 3166-1 alpha-2 ('US', 'HN', 'MX', 'ES', ...).
-- Los teléfonos sin +código de país se validan/formatean asumiendo este país.
alter table salon_settings add column if not exists default_country text
  not null default 'US';
