-- 026: Endurecer fichas de consentimiento
-- Ejecutar en el SQL Editor de Supabase (una sola vez), DESPUÉS de la 025.

-- Nombre tal como se firmó: la ficha es un documento legal y debe quedar
-- congelada aunque después se corrija/edite el nombre del cliente
alter table client_consents
  add column if not exists signer_name text;

-- Una sola ficha por cita (los tres flujos ya lo evitan; esto lo blinda
-- contra dobles taps o condiciones de carrera)
create unique index if not exists client_consents_appt_uniq
  on client_consents (appointment_id)
  where appointment_id is not null;
