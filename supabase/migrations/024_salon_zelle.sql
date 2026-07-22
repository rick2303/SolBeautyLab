-- ============================================================
-- 024 · Zelle para el depósito opcional del booking
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- El booking en línea (/book) acepta un comprobante de depósito opcional,
-- pero no decía a dónde enviar el dinero. Ahora el número y el nombre de
-- la cuenta Zelle se configuran en Configuración y se muestran en /book
-- junto al campo del comprobante.
-- ============================================================

alter table salon_settings add column if not exists zelle_number text;
alter table salon_settings add column if not exists zelle_name text;

-- Valores iniciales de Sol Beauty Lab
update salon_settings set
  zelle_number = coalesce(zelle_number, '(214) 451-8162'),
  zelle_name   = coalesce(zelle_name, 'Martha Zamarron')
where id = true;
