-- ============================================================
-- 022 · Comprobante de depósito en la cita
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Permite adjuntar una imagen (foto del depósito/transferencia) a cada
-- cita, tanto al agendar (/book y "nueva cita") como después desde el
-- calendario. Se guarda la URL pública de la imagen en la cita.
-- ============================================================

alter table appointments add column if not exists deposit_url text;

-- Bucket público para los comprobantes (igual que client-photos)
insert into storage.buckets (id, name, public)
values ('deposit-photos', 'deposit-photos', true)
on conflict (id) do nothing;

-- El equipo autenticado ve, sube y borra comprobantes.
-- Las reservas desde /book (anónimas) suben por el servidor con la
-- service-role, que no pasa por estas políticas.
drop policy if exists "deposit photos read" on storage.objects;
create policy "deposit photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'deposit-photos');

drop policy if exists "deposit photos upload" on storage.objects;
create policy "deposit photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'deposit-photos');

drop policy if exists "deposit photos delete" on storage.objects;
create policy "deposit photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'deposit-photos');
