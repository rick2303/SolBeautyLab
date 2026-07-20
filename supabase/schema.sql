-- ============================================================
-- SŌL BEAUTY LAB · Esquema de base de datos para Supabase
-- Roles: owner · receptionist · staff
-- Incluye: citas, clientes, servicios, pagos, gastos,
--          recordatorios automáticos por SMS y WhatsApp
-- ============================================================

-- ---------- ENUMS ----------
create type user_role as enum ('owner', 'receptionist', 'staff');

create type appointment_status as enum (
  'scheduled',    -- agendada
  'confirmed',    -- cliente confirmó (vía link del reminder)
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

create type payment_method as enum ('cash', 'card', 'zelle', 'venmo', 'transfer', 'other');

create type expense_category as enum ('supplies', 'rent', 'marketing', 'utilities', 'equipment', 'other');

create type reminder_type as enum (
  'appointment_reminder',  -- recordatorio 24h antes (configurable)
  'confirmation_request',  -- solicitud de confirmación con link
  'thank_you'              -- agradecimiento post-visita con link de rebooking
);

create type message_channel as enum ('sms', 'whatsapp');

create type message_status as enum ('pending', 'sent', 'delivered', 'failed', 'cancelled');

-- ============================================================
-- 1. PROFILES — usuarios del sistema (extiende auth.users)
--    El equipo (Team) y los usuarios del login son lo mismo:
--    cada empleado tiene una cuenta con un rol.
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  role        user_role not null default 'staff',
  specialty   text,                 -- 'Lashes', 'Nails', 'Barber'...
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Helper para RLS: rol del usuario autenticado
create or replace function my_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================================
-- 2. SERVICE_CATEGORIES y SERVICES
-- ============================================================
create table service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,        -- 'Nails', 'Lashes', 'Barber'
  sort_order  int not null default 0
);

create table services (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references service_categories(id),
  name          text not null,             -- 'Gel full set'
  price         numeric(10,2) not null,
  duration_min  int not null,              -- duración en minutos
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 3. CLIENTS — libreta de clientes
--    visits / total gastado / última visita NO se guardan:
--    se calculan con la vista client_stats (abajo).
-- ============================================================
create table clients (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  phone             text not null,          -- E.164 recomendado: +13054129087
  email             text,
  notes             text,                   -- preferencias, alergias, etc.
  tags              text[] not null default '{}',  -- ['VIP','Lashes','Sensitive']
  -- Consentimiento para mensajería (obligatorio para SMS/WhatsApp)
  sms_opt_in        boolean not null default true,
  whatsapp_opt_in   boolean not null default true,
  preferred_channel message_channel default 'whatsapp',
  created_at        timestamptz not null default now(),
  created_by        uuid references profiles(id)
);

create unique index clients_phone_idx on clients (phone);

-- ============================================================
-- 4. APPOINTMENTS — citas
--    price y duration se copian del servicio al crear la cita
--    (snapshot: si luego cambias el precio, la cita histórica no cambia)
-- ============================================================
create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references clients(id),
  service_id          uuid not null references services(id),
  staff_id            uuid not null references profiles(id),   -- técnico asignado
  starts_at           timestamptz not null,
  duration_min        int not null,
  price               numeric(10,2) not null,
  status              appointment_status not null default 'scheduled',
  notes               text,
  confirmation_token  uuid not null default gen_random_uuid(), -- para el link "Confirm appointment"
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index appointments_starts_at_idx on appointments (starts_at);
create index appointments_staff_idx on appointments (staff_id, starts_at);
create index appointments_client_idx on appointments (client_id);

-- ============================================================
-- 5. PAYMENTS — ingresos
-- ============================================================
create table payments (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references appointments(id),  -- nullable: se aceptan pagos sueltos
  client_id       uuid not null references clients(id),
  amount          numeric(10,2) not null,
  method          payment_method not null default 'cash',
  paid_at         timestamptz not null default now(),
  recorded_by     uuid references profiles(id),
  notes           text
);

create index payments_paid_at_idx on payments (paid_at);

-- ============================================================
-- 6. EXPENSES — gastos
-- ============================================================
create table expenses (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  category      expense_category not null default 'supplies',
  amount        numeric(10,2) not null,
  expense_date  date not null default current_date,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 7. SALON_SETTINGS — configuración global (fila única)
-- ============================================================
create table salon_settings (
  id              boolean primary key default true check (id), -- singleton
  salon_name      text not null default 'Sol Beauty Lab',
  timezone        text not null default 'America/New_York',
  currency        text not null default 'USD',
  premium_active  boolean not null default false,
  opening_hours   jsonb not null default '{"mon":["09:00","19:00"],"tue":["09:00","19:00"],"wed":["09:00","19:00"],"thu":["09:00","19:00"],"fri":["09:00","19:00"],"sat":["09:00","17:00"],"sun":null}'
);

insert into salon_settings default values;

-- ============================================================
-- 8. REMINDER_SETTINGS — los 3 toggles del prototipo
-- ============================================================
create table reminder_settings (
  type          reminder_type primary key,
  enabled       boolean not null default false,
  hours_offset  int not null default 24,      -- antes (reminder) o después (thank_you) de la cita
  channels      message_channel[] not null default '{whatsapp,sms}'
);

insert into reminder_settings (type, enabled, hours_offset, channels) values
  ('appointment_reminder', true, 24, '{whatsapp,sms}'),
  ('confirmation_request', true, 48, '{whatsapp}'),
  ('thank_you',            false, 2, '{whatsapp}');

-- ============================================================
-- 9. MESSAGE_TEMPLATES — plantillas por tipo/canal/idioma
--    Variables: {{client_name}} {{service}} {{staff}} {{date}} {{time}} {{confirm_url}}
-- ============================================================
create table message_templates (
  id        uuid primary key default gen_random_uuid(),
  type      reminder_type not null,
  channel   message_channel not null,
  language  text not null default 'es',
  body      text not null,
  -- WhatsApp Cloud API exige plantillas pre-aprobadas por Meta:
  wa_template_name text,
  unique (type, channel, language)
);

insert into message_templates (type, channel, language, body) values
  ('appointment_reminder', 'sms', 'es',
   'Hola {{client_name}}, te recordamos tu cita en Sol Beauty Lab: {{service}} con {{staff}} el {{date}} a las {{time}}. Confirma o reagenda aquí: {{confirm_url}}'),
  ('confirmation_request', 'sms', 'es',
   'Hola {{client_name}}, ¿nos confirmas tu cita en Sol Beauty Lab del {{date}} a las {{time}} ({{service}})? Toca aquí para confirmar: {{confirm_url}}'),
  ('thank_you', 'sms', 'es',
   'Gracias por tu visita, {{client_name}}. Fue un gusto atenderte en Sol Beauty Lab. Reserva tu próxima cita cuando gustes: {{confirm_url}}');

-- ============================================================
-- 10. MESSAGES — cola + log de envíos (SMS / WhatsApp)
--     Un cron (pg_cron) encola los mensajes que tocan;
--     una Edge Function los envía vía Twilio / WhatsApp Cloud API
--     y los webhooks del proveedor actualizan el status.
-- ============================================================
create table messages (
  id                   uuid primary key default gen_random_uuid(),
  appointment_id       uuid references appointments(id) on delete cascade,
  client_id            uuid not null references clients(id),
  type                 reminder_type not null,
  channel              message_channel not null,
  to_phone             text not null,
  body                 text not null,
  status               message_status not null default 'pending',
  scheduled_at         timestamptz not null,
  sent_at              timestamptz,
  provider             text,                -- 'twilio' | 'whatsapp_cloud'
  provider_message_id  text,                -- SID de Twilio / wamid de Meta
  error_message        text,
  created_at           timestamptz not null default now()
);

-- Evita duplicados: un solo mensaje por cita+tipo+canal
create unique index messages_dedupe_idx
  on messages (appointment_id, type, channel)
  where appointment_id is not null;

create index messages_pending_idx on messages (status, scheduled_at) where status = 'pending';

-- ============================================================
-- VISTA: estadísticas por cliente (visits, gastado, última visita,
-- servicio favorito) — lo que el prototipo muestra en las cards
-- ============================================================
create view client_stats as
select
  c.id as client_id,
  count(a.id) filter (where a.status = 'completed')            as visits,
  coalesce(sum(p.amount), 0)                                   as total_spent,
  max(a.starts_at) filter (where a.status = 'completed')       as last_visit,
  (select s.name
     from appointments a2
     join services s on s.id = a2.service_id
    where a2.client_id = c.id and a2.status = 'completed'
    group by s.name order by count(*) desc limit 1)            as favorite_service,
  c.created_at > now() - interval '30 days'                    as is_new
from clients c
left join appointments a on a.client_id = c.id
left join payments p on p.client_id = c.id
group by c.id;

-- ============================================================
-- ROW LEVEL SECURITY
--   owner        → acceso total
--   receptionist → citas, clientes, pagos, servicios (lectura),
--                  SIN gastos ni gestión de equipo
--   staff        → solo SU agenda; clientes en lectura
-- ============================================================
alter table profiles          enable row level security;
alter table service_categories enable row level security;
alter table services          enable row level security;
alter table clients           enable row level security;
alter table appointments      enable row level security;
alter table payments          enable row level security;
alter table expenses          enable row level security;
alter table salon_settings    enable row level security;
alter table reminder_settings enable row level security;
alter table message_templates enable row level security;
alter table messages          enable row level security;

-- PROFILES: todos leen (para mostrar el equipo); solo owner modifica
create policy "profiles read"   on profiles for select to authenticated using (true);
create policy "profiles manage" on profiles for all to authenticated
  using (my_role() = 'owner') with check (my_role() = 'owner');

-- CATÁLOGO: todos leen; solo owner modifica
create policy "categories read"   on service_categories for select to authenticated using (true);
create policy "categories manage" on service_categories for all to authenticated
  using (my_role() = 'owner') with check (my_role() = 'owner');
create policy "services read"   on services for select to authenticated using (true);
create policy "services manage" on services for all to authenticated
  using (my_role() = 'owner') with check (my_role() = 'owner');

-- CLIENTS: staff lee; owner y receptionist crean/editan
create policy "clients read" on clients for select to authenticated using (true);
create policy "clients insert" on clients for insert to authenticated
  with check (my_role() in ('owner','receptionist'));
create policy "clients update" on clients for update to authenticated
  using (my_role() in ('owner','receptionist'));
create policy "clients delete" on clients for delete to authenticated
  using (my_role() = 'owner');

-- APPOINTMENTS: staff solo ve/edita su propia agenda
create policy "appts read" on appointments for select to authenticated
  using (my_role() in ('owner','receptionist') or staff_id = auth.uid());
create policy "appts insert" on appointments for insert to authenticated
  with check (my_role() in ('owner','receptionist') or staff_id = auth.uid());
create policy "appts update" on appointments for update to authenticated
  using (my_role() in ('owner','receptionist') or staff_id = auth.uid());
create policy "appts delete" on appointments for delete to authenticated
  using (my_role() in ('owner','receptionist'));

-- PAYMENTS: owner y receptionist
create policy "payments read" on payments for select to authenticated
  using (my_role() in ('owner','receptionist'));
create policy "payments insert" on payments for insert to authenticated
  with check (my_role() in ('owner','receptionist'));
create policy "payments manage" on payments for update to authenticated
  using (my_role() = 'owner');

-- EXPENSES: solo owner
create policy "expenses all" on expenses for all to authenticated
  using (my_role() = 'owner') with check (my_role() = 'owner');

-- SETTINGS / REMINDERS / TEMPLATES: lectura todos, gestión owner
create policy "settings read"   on salon_settings for select to authenticated using (true);
create policy "settings manage" on salon_settings for update to authenticated
  using (my_role() = 'owner');
create policy "rem settings read"   on reminder_settings for select to authenticated using (true);
create policy "rem settings manage" on reminder_settings for update to authenticated
  using (my_role() = 'owner');
create policy "templates read"   on message_templates for select to authenticated using (true);
create policy "templates manage" on message_templates for all to authenticated
  using (my_role() = 'owner') with check (my_role() = 'owner');

-- MESSAGES: owner/receptionist leen el log. Los inserta el sistema
-- (pg_cron / Edge Function con service_role, que ignora RLS).
create policy "messages read" on messages for select to authenticated
  using (my_role() in ('owner','receptionist'));

-- ============================================================
-- TRIGGER: crear profile automáticamente al registrarse un usuario
-- (el owner luego les asigna rol desde la app)
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- FUNCIÓN: encolar recordatorios pendientes.
-- Se ejecuta cada 5 min con pg_cron:
--   select cron.schedule('queue-reminders', '*/5 * * * *', 'select queue_due_reminders()');
-- Luego una Edge Function (invocada también por cron) toma los
-- messages con status='pending' y scheduled_at <= now() y los envía
-- por Twilio (SMS) o WhatsApp Cloud API.
-- ============================================================
create or replace function queue_due_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  rs record;
begin
  for rs in select * from reminder_settings where enabled loop
    if rs.type in ('appointment_reminder','confirmation_request') then
      insert into messages (appointment_id, client_id, type, channel, to_phone, body, scheduled_at)
      select a.id, c.id, rs.type, ch, c.phone,
             replace(replace(replace(replace(replace(t.body,
               '{{client_name}}', split_part(c.full_name,' ',1)),
               '{{service}}', s.name),
               '{{staff}}', split_part(pr.full_name,' ',1)),
               '{{date}}', to_char(a.starts_at at time zone st.timezone, 'DD Mon')),
               '{{time}}', to_char(a.starts_at at time zone st.timezone, 'HH12:MI AM')),
             a.starts_at - make_interval(hours => rs.hours_offset)
      from appointments a
      join clients c   on c.id = a.client_id
      join services s  on s.id = a.service_id
      join profiles pr on pr.id = a.staff_id
      cross join salon_settings st
      cross join unnest(rs.channels) as ch
      join message_templates t on t.type = rs.type and t.channel = ch and t.language = 'es'
      where a.status in ('scheduled','confirmed')
        and a.starts_at between now() and now() + interval '7 days'
        and ((ch = 'sms' and c.sms_opt_in) or (ch = 'whatsapp' and c.whatsapp_opt_in))
      on conflict (appointment_id, type, channel) where appointment_id is not null do nothing;
    end if;
  end loop;
end;
$$;
