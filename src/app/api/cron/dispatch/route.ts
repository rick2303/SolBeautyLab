import { NextResponse } from "next/server";
import { admin, sendApptSms, type ApptForMsg } from "@/lib/messaging";
import { isTwilioConfigured } from "@/lib/sms";
import type { ReminderType } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT =
  "id, starts_at, duration_min, status, confirmation_token, staff_id, clients(id, full_name, phone), services(name), profiles!staff_id(full_name, phone)";

/**
 * Motor de mensajería. Un cron (pg_cron de Supabase, gratis) le pega cada
 * pocos minutos con `Authorization: Bearer ${CRON_SECRET}`.
 *
 *  · Recordatorio  → 1 h antes de la cita (offset configurable), citas
 *                    scheduled/confirmed que aún no lo tienen.
 *  · Agradecimiento → 5 h después de terminada la cita, solo si quedó
 *                    completada.
 *
 * La confirmación al agendar y el aviso al staff se envían al instante desde
 * el flujo de creación, no aquí.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing service key" }, { status: 500 });
  }
  // Sin Twilio conectado no hay nada que enviar
  if (!isTwilioConfigured()) {
    return NextResponse.json({ ok: true, skipped: "twilio_not_configured" });
  }

  const db = admin();
  const now = Date.now();

  // Offsets configurables (reminder_settings.hours_offset)
  const { data: settings } = await db
    .from("reminder_settings")
    .select("type, hours_offset, enabled");
  const cfg = new Map(
    (settings ?? []).map((s) => [s.type as ReminderType, s])
  );
  const remOffset = cfg.get("appointment_reminder")?.hours_offset ?? 1;
  const thxOffset = cfg.get("thank_you")?.hours_offset ?? 5;

  let reminders = 0;
  let thankyous = 0;

  // ---- 1. Recordatorios: cita dentro de la ventana [now, now+offset] ----
  if (cfg.get("appointment_reminder")?.enabled) {
    const until = new Date(now + remOffset * 3600_000).toISOString();
    const { data: due } = await db
      .from("appointments")
      .select(SELECT)
      .in("status", ["scheduled", "confirmed"])
      .gte("starts_at", new Date(now).toISOString())
      .lte("starts_at", until);
    for (const a of due ?? []) {
      const before = await already(db, a.id, "appointment_reminder");
      if (before) continue;
      await sendApptSms(db, a as unknown as ApptForMsg, "appointment_reminder");
      reminders++;
    }
  }

  // ---- 2. Agradecimiento: completada y terminó hace >= offset horas ----
  if (cfg.get("thank_you")?.enabled) {
    // Traemos completadas recientes y filtramos por hora de fin en JS
    const since = new Date(now - 14 * 86400_000).toISOString(); // últimas 2 sem.
    const { data: done } = await db
      .from("appointments")
      .select(SELECT)
      .eq("status", "completed")
      .gte("starts_at", since);
    for (const a of done ?? []) {
      const ends = new Date(a.starts_at).getTime() + a.duration_min * 60000;
      if (ends + thxOffset * 3600_000 > now) continue; // aún no toca
      const before = await already(db, a.id, "thank_you");
      if (before) continue;
      await sendApptSms(db, a as unknown as ApptForMsg, "thank_you");
      thankyous++;
    }
  }

  return NextResponse.json({ ok: true, reminders, thankyous });
}

/** ¿Ya hay un mensaje de ese tipo para la cita? (evita reenvíos) */
async function already(
  db: ReturnType<typeof admin>,
  appointmentId: string,
  type: ReminderType
): Promise<boolean> {
  const { data } = await db
    .from("messages")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("type", type)
    .eq("channel", "sms")
    .limit(1);
  return (data ?? []).length > 0;
}
