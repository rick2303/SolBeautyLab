-- ============================================================
-- 014 · Categorías de servicios: ícono + activar/desactivar
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Glifo unicode monocromo elegido al crear la categoría.
-- null = ícono por defecto (❀ / heurística por nombre en /book).
alter table service_categories add column if not exists icon text;

-- Categoría desactivada = oculta del booking en línea (y sus servicios
-- dejan de ser reservables), pero se conserva con su historial.
alter table service_categories add column if not exists is_active boolean
  not null default true;

-- Ocultar precios en el booking para esta categoría (p. ej. uñas, donde la
-- clienta suele cambiar de servicio al llegar y el precio online genera
-- discusiones). El precio solo se ve en el salón.
alter table service_categories add column if not exists hide_prices boolean
  not null default false;
