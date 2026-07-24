"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { onAppointmentCreated } from "@/lib/messaging";

/** Cita existente que choca con el horario propuesto */
export interface ConflictInfo {
  clientName: string | null;
  serviceName: string | null;
  staffName: string | null;
  startsAt: string;
  endsAt: string;
}

/**
 * Valida traslapes de técnico Y de cliente en el servidor con service-role:
 * el rol staff no ve citas ajenas por RLS, así que sus chequeos en el
 * cliente eran parciales. Lo usan los modales de cita, walk-in y reagendar.
 */
export async function checkAppointmentConflicts(input: {
  staffId: string;
  clientId?: string | null;
  startsISO: string;
  durationMin: number;
  excludeApptId?: string | null;
}): Promise<{ staff?: ConflictInfo; client?: ConflictInfo; error?: string }> {
  const session = await getSessionProfile();
  if (!session?.profile) return { error: "Not signed in" };

  const starts = new Date(input.startsISO);
  const dur = Math.floor(Number(input.durationMin));
  if (isNaN(starts.getTime()) || !dur || dur < 1 || dur > 24 * 60) {
    return { error: "Invalid time" };
  }
  const ends = new Date(starts.getTime() + dur * 60000);

  // service-role para ver TODAS las citas; si no está configurado (dev),
  // cae al cliente con sesión (RLS) — mejor un chequeo parcial que ninguno
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = key
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : await createClient();

  const filters = [`staff_id.eq.${input.staffId}`];
  if (input.clientId) filters.push(`client_id.eq.${input.clientId}`);
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, starts_at, duration_min, staff_id, client_id, clients(full_name), services(name), profiles!staff_id(full_name)"
    )
    .in("status", ["scheduled", "confirmed", "in_progress"])
    .gte(
      "starts_at",
      new Date(starts.getTime() - 12 * 3600000).toISOString()
    )
    .lt("starts_at", ends.toISOString())
    .or(filters.join(","));
  if (error) return { error: error.message };

  const overlapping = (data ?? []).filter((a) => {
    if (input.excludeApptId && a.id === input.excludeApptId) return false;
    const aStart = new Date(a.starts_at);
    const aEnd = new Date(aStart.getTime() + a.duration_min * 60000);
    return starts < aEnd && aStart < ends;
  });

  const info = (a: (typeof overlapping)[number]): ConflictInfo => ({
    clientName:
      (a.clients as unknown as { full_name: string } | null)?.full_name ?? null,
    serviceName:
      (a.services as unknown as { name: string } | null)?.name ?? null,
    staffName:
      (a.profiles as unknown as { full_name: string } | null)?.full_name ??
      null,
    startsAt: a.starts_at,
    endsAt: new Date(
      new Date(a.starts_at).getTime() + a.duration_min * 60000
    ).toISOString(),
  });

  const staffHit = overlapping.find((a) => a.staff_id === input.staffId);
  const clientHit = input.clientId
    ? overlapping.find((a) => a.client_id === input.clientId)
    : undefined;
  return {
    ...(staffHit ? { staff: info(staffHit) } : {}),
    ...(clientHit ? { client: info(clientHit) } : {}),
  };
}

/**
 * Se llama desde el cliente tras crear una cita interna. Envía el SMS de
 * confirmación al cliente (con link) y avisa al staff (SMS + push).
 * Verifica sesión: solo el equipo agenda desde dentro de la app.
 */
export async function notifyInternalAppointment(
  appointmentId: string
): Promise<void> {
  const session = await getSessionProfile();
  if (!session?.profile) return;
  try {
    await onAppointmentCreated(appointmentId, { requestConfirmation: true });
  } catch {
    // El SMS/push nunca debe romper el flujo de agendado
  }
}
