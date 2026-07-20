"use server";

import { getSessionProfile } from "@/lib/supabase/server";
import { onAppointmentCreated } from "@/lib/messaging";

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
