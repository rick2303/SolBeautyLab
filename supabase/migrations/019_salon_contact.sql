-- ============================================================
-- 019 · Datos de contacto del salón (configurables por la dueña)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Antes estaban escritos a mano en el código del booking. Ahora se editan
-- desde Configuración y se muestran en /book. El horario ya vive en
-- opening_hours (columna existente), así que el booking lo reutiliza.
-- ============================================================

alter table salon_settings add column if not exists phone text;
alter table salon_settings add column if not exists whatsapp text;
alter table salon_settings add column if not exists instagram text;
alter table salon_settings add column if not exists address text;

-- Valores iniciales de Sol Beauty Lab (para que /book no salga vacío)
update salon_settings set
  phone     = coalesce(phone, '(972) 278-8739'),
  whatsapp  = coalesce(whatsapp, '(214) 541-8162'),
  instagram = coalesce(instagram, 'Sol.beauty.lab'),
  address   = coalesce(address, '1401 Northwest Hwy, Suite 105 · Garland, TX 75041')
where id = true;
