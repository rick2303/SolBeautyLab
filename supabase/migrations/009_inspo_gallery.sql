-- ============================================================
-- 009 · Inspo: tablero de inspiración por cita (Supabase Storage)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Bucket PRIVADO (a diferencia de client-photos): las fotos se sirven
-- con signed URLs, nunca con URL pública.
insert into storage.buckets (id, name, public)
values ('inspo-photos', 'inspo-photos', false)
on conflict (id) do nothing;

-- Las fotos viven en carpetas por cita: {appointment_id}/{archivo}.
-- Cada staff solo ve/sube/borra fotos de SUS citas asignadas; la dueña ve todo.
-- (storage.foldername(name))[1] extrae el appointment_id de la ruta.

create policy "inspo photos read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'inspo-photos' and (
      my_role() = 'owner'
      or exists (
        select 1 from appointments a
        where a.id::text = (storage.foldername(name))[1]
          and a.staff_id = auth.uid()
      )
    )
  );

create policy "inspo photos upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'inspo-photos' and (
      my_role() = 'owner'
      or exists (
        select 1 from appointments a
        where a.id::text = (storage.foldername(name))[1]
          and a.staff_id = auth.uid()
      )
    )
  );

create policy "inspo photos delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'inspo-photos' and (
      my_role() = 'owner'
      or exists (
        select 1 from appointments a
        where a.id::text = (storage.foldername(name))[1]
          and a.staff_id = auth.uid()
      )
    )
  );
