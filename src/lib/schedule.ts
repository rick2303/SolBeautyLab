import type { WorkHours } from "@/lib/types";

export type DayHours = [string, string] | null;

export const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Horas efectivas de un técnico un día: salón ∩ horario propio.
 * staffHours null = sin horario propio → aplican las horas del salón.
 * Devuelve null si ese día no se puede agendar con ese técnico.
 */
export function effectiveDayHours(
  salon: DayHours,
  staffHours: WorkHours | null | undefined,
  dowKey: string
): DayHours {
  if (!salon) return null;
  if (staffHours == null) return salon;
  const own = staffHours[dowKey] ?? null;
  if (!own) return null;
  const start = toMin(salon[0]) > toMin(own[0]) ? salon[0] : own[0];
  const end = toMin(salon[1]) < toMin(own[1]) ? salon[1] : own[1];
  return toMin(start) < toMin(end) ? [start, end] : null;
}
