-- ============================================================
-- 018 · Varias especialidades por miembro del equipo
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Antes cada persona tenía una sola especialidad (texto libre y luego una
-- categoría). Ahora puede tener varias: quien hace uñas y pestañas ya no
-- tiene que elegir una.
-- ============================================================

alter table profiles add column if not exists specialties text[]
  not null default '{}';

-- Conserva lo que ya estuviera asignado (specialty → primer elemento)
update profiles
   set specialties = array[specialty]
 where specialty is not null
   and specialty <> ''
   and specialties = '{}';

-- La columna antigua `specialty` queda sin uso en la app; se puede borrar
-- más adelante con:  alter table profiles drop column specialty;
