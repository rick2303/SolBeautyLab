"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/server";
import type { WorkHours } from "@/lib/types";

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Guarda el horario semanal de un miembro. Pasa por service_role (no RLS)
 * porque profiles contiene "role" y una política de UPDATE por-fila
 * permitiría escalar privilegios; aquí solo se toca work_hours.
 */
export async function saveWorkHours(
  targetId: string,
  hours: WorkHours | null
): Promise<{ ok?: true; error?: string }> {
  const session = await getSessionProfile();
  const me = session?.profile;
  if (!me) return { error: "Not signed in" };
  if (me.id !== targetId && me.role !== "owner") {
    return { error: "You can only edit your own schedule" };
  }

  if (hours !== null) {
    for (const [key, val] of Object.entries(hours)) {
      if (!DOW_KEYS.includes(key)) return { error: "Invalid day: " + key };
      if (val === null) continue;
      if (
        !Array.isArray(val) ||
        val.length !== 2 ||
        !TIME_RE.test(val[0]) ||
        !TIME_RE.test(val[1])
      ) {
        return { error: "Invalid hours format" };
      }
      if (val[0] >= val[1]) return { error: "Start must be before end" };
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin
    .from("profiles")
    .update({ work_hours: hours })
    .eq("id", targetId);
  if (error) return { error: error.message };

  return { ok: true };
}
