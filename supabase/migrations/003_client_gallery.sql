-- ============================================================
-- 003 · Galería de trabajos por cliente (Supabase Storage)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', true)
on conflict (id) do nothing;

-- El equipo autenticado puede ver, subir y borrar fotos
create policy "client photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-photos');

create policy "client photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-photos');

create policy "client photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-photos');
