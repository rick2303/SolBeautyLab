-- 025: Walk-ins + ficha de cliente y consentimiento informado
-- Ejecutar en el SQL Editor de Supabase (una sola vez)

-- Marca las citas creadas desde el botón de walk-in del dashboard
alter table appointments
  add column if not exists is_walk_in boolean not null default false;

-- Ficha digital de cliente + consentimiento informado (una por servicio).
-- Los checkboxes se guardan con llaves neutras de idioma (la UI las traduce).
create table if not exists client_consents (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  appointment_id     uuid references appointments(id) on delete set null,
  staff_id           uuid references profiles(id) on delete set null,
  service_label      text not null default '',
  birth_date         date,
  address            text,
  emergency_contact  text,
  emergency_phone    text,
  medical_conditions text[] not null default '{}',
  medications        text,
  allergies          text,
  chemical_acks      text[] not null default '{}',
  photos_record      boolean not null default false,
  photos_social      boolean not null default false,
  signature          text not null, -- firma del cliente (PNG data-url)
  signed_at          timestamptz not null default now(),
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now()
);

create index if not exists client_consents_client_idx
  on client_consents (client_id, signed_at desc);

alter table client_consents enable row level security;

-- Lectura para todo el equipo; crean los tres roles; solo owner borra.
-- Sin update: una ficha firmada no se edita, se firma una nueva.
create policy "consents read" on client_consents for select to authenticated
  using (true);
create policy "consents insert" on client_consents for insert to authenticated
  with check (my_role() in ('owner','receptionist','staff'));
create policy "consents delete" on client_consents for delete to authenticated
  using (my_role() = 'owner');
