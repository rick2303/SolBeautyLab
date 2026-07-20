import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SALON_TZ } from "@/lib/tz";
import { sendSms, isTwilioConfigured } from "@/lib/sms";
import { sendPushToProfile } from "@/lib/push";
import type { ReminderType } from "@/lib/types";

export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://solbeautylab.cc").replace(/\/$/, "");

export function fmtDateSalon(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    timeZone: SALON_TZ,
  });
}
export function fmtTimeSalon(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SALON_TZ,
  });
}

export interface ApptForMsg {
  id: string;
  starts_at: string;
  confirmation_token: string;
  clients: { full_name: string; phone: string } | null;
  services: { name: string } | null;
  profiles: { full_name: string; phone: string | null } | null;
  staff_id: string;
}

const SELECT =
  "id, starts_at, confirmation_token, staff_id, clients(full_name, phone), services(name), profiles!staff_id(full_name, phone)";

/** Rellena {{variables}} de una plantilla con los datos de la cita */
export function renderTemplate(body: string, a: ApptForMsg): string {
  return body
    .replace(/\{\{client_name\}\}/g, a.clients?.full_name?.split(" ")[0] ?? "")
    .replace(/\{\{service\}\}/g, a.services?.name ?? "")
    .replace(/\{\{staff\}\}/g, a.profiles?.full_name?.split(" ")[0] ?? "")
    .replace(/\{\{date\}\}/g, fmtDateSalon(a.starts_at))
    .replace(/\{\{time\}\}/g, fmtTimeSalon(a.starts_at))
    .replace(/\{\{confirm_url\}\}/g, `${appUrl()}/c/${a.confirmation_token}`);
}

/** Plantilla SMS activa de un tipo (idioma del salón: español) */
async function smsTemplate(
  db: ReturnType<typeof admin>,
  type: ReminderType
): Promise<string | null> {
  const { data } = await db
    .from("message_templates")
    .select("body")
    .eq("type", type)
    .eq("channel", "sms")
    .limit(1);
  return data?.[0]?.body ?? null;
}

/** ¿Está activado ese tipo de recordatorio? */
async function isEnabled(
  db: ReturnType<typeof admin>,
  type: ReminderType
): Promise<boolean> {
  const { data } = await db
    .from("reminder_settings")
    .select("enabled")
    .eq("type", type)
    .single();
  return data?.enabled === true;
}

/**
 * Envía un SMS de un tipo a una cita y lo registra en `messages`.
 * El índice único (appointment_id, type, channel) evita duplicados: si ya
 * se envió, el insert falla en silencio y no se manda de nuevo.
 */
export async function sendApptSms(
  db: ReturnType<typeof admin>,
  appt: ApptForMsg,
  type: ReminderType
): Promise<void> {
  // Sin Twilio conectado no encolamos nada (evita llenar la cola de fallidos)
  if (!isTwilioConfigured()) return;
  const phone = appt.clients?.phone;
  if (!phone) return;
  if (!(await isEnabled(db, type))) return;

  // Reservar el slot en la cola primero (dedupe atómico)
  const tpl = await smsTemplate(db, type);
  if (!tpl) return;
  const body = renderTemplate(tpl, appt);

  const { error: dupErr } = await db.from("messages").insert({
    appointment_id: appt.id,
    client_id: (appt.clients as unknown as { id?: string })?.id ?? undefined,
    type,
    channel: "sms",
    to_phone: phone,
    body,
    status: "pending",
    scheduled_at: new Date().toISOString(),
  });
  // Si ya existe (dedupe) no reintentamos
  if (dupErr) return;

  const res = await sendSms(phone, body);
  await db
    .from("messages")
    .update({
      status: res.ok ? "sent" : "failed",
      sent_at: res.ok ? new Date().toISOString() : null,
      provider: "twilio",
      provider_message_id: res.sid ?? null,
      error_message: res.error ?? null,
    })
    .eq("appointment_id", appt.id)
    .eq("type", type)
    .eq("channel", "sms");
}

/** Avisa al técnico asignado (SMS + push) que tiene una cita nueva */
export async function notifyStaff(
  db: ReturnType<typeof admin>,
  appt: ApptForMsg
): Promise<void> {
  const { data: settings } = await db
    .from("salon_settings")
    .select("staff_booking_template")
    .single();
  const tpl =
    settings?.staff_booking_template ||
    "Nueva cita: {{client_name}} · {{service}} · {{date}} a las {{time}}";
  const msg = renderTemplate(tpl, appt);

  await Promise.allSettled([
    appt.profiles?.phone ? sendSms(appt.profiles.phone, msg) : Promise.resolve(),
    sendPushToProfile(appt.staff_id, {
      title: "Nueva cita agendada",
      body: msg,
      url: "/calendar",
    }),
  ]);
}

/**
 * Se llama justo después de crear una cita.
 * - requestConfirmation: manda al cliente el SMS de confirmación con link
 *   (agenda interna). En /book la cita ya nace confirmada, así que no.
 * - Siempre avisa al staff asignado.
 */
export async function onAppointmentCreated(
  appointmentId: string,
  opts: { requestConfirmation: boolean }
): Promise<void> {
  const db = admin();
  const { data } = await db
    .from("appointments")
    .select(SELECT)
    .eq("id", appointmentId)
    .single();
  if (!data) return;
  const appt = data as unknown as ApptForMsg;

  await Promise.allSettled([
    opts.requestConfirmation
      ? sendApptSms(db, appt, "confirmation_request")
      : Promise.resolve(),
    notifyStaff(db, appt),
  ]);
}
