-- ============================================================
-- 020 · Mensajería: push del staff + tiempos de recordatorio
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Suscripciones Web Push del staff (una por navegador/dispositivo).
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Cada usuario gestiona solo su propia suscripción. El envío lo hace el
-- servidor con service-role (ignora RLS), igual que book/actions.ts.
drop policy if exists "push own" on push_subscriptions;
create policy "push own" on push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Flujo definido por la dueña:
--   · recordatorio de cita  → 1 h antes, solo SMS
--   · agradecimiento        → 5 h después (si quedó completada), solo SMS
--   · confirmación          → inmediata al agendar (no usa offset)
update reminder_settings set hours_offset = 1, channels = '{sms}', enabled = true
  where type = 'appointment_reminder';
update reminder_settings set hours_offset = 5, channels = '{sms}', enabled = true
  where type = 'thank_you';
update reminder_settings set channels = '{sms}', enabled = true
  where type = 'confirmation_request';
