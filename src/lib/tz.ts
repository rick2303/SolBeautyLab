// Fechas en la zona horaria del salón (Texas por defecto).
// Evita que "hoy" y "este mes" se desfasen cuando el servidor corre en UTC.

export const SALON_TZ = "America/Chicago";

interface Wall {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
}

export function wallParts(tz: string, date: Date = new Date()): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour") % 24,
    min: get("minute"),
  };
}

/** Instante UTC en el que el reloj de pared de `tz` marca la fecha/hora dada */
export function utcFromWall(
  tz: string,
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0
): Date {
  let t = Date.UTC(y, m - 1, d, h, min);
  for (let i = 0; i < 3; i++) {
    const w = wallParts(tz, new Date(t));
    const diff =
      Date.UTC(w.y, w.m - 1, w.d, w.h, w.min) - Date.UTC(y, m - 1, d, h, min);
    if (diff === 0) break;
    t -= diff;
  }
  return new Date(t);
}

/** Rango [inicio, fin) del día actual del salón, en ISO UTC */
export function dayRangeTz(base: Date = new Date(), tz = SALON_TZ) {
  const w = wallParts(tz, base);
  const from = utcFromWall(tz, w.y, w.m, w.d);
  const n = new Date(Date.UTC(w.y, w.m - 1, w.d + 1));
  const to = utcFromWall(
    tz,
    n.getUTCFullYear(),
    n.getUTCMonth() + 1,
    n.getUTCDate()
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Rango [inicio, fin) del mes actual del salón, en ISO UTC */
export function monthRangeTz(base: Date = new Date(), tz = SALON_TZ) {
  const w = wallParts(tz, base);
  const from = utcFromWall(tz, w.y, w.m, 1);
  const n = new Date(Date.UTC(w.y, w.m, 1));
  const to = utcFromWall(tz, n.getUTCFullYear(), n.getUTCMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** 'YYYY-MM-DD' de hoy según el reloj del salón */
export function todayKeyTz(tz = SALON_TZ): string {
  const w = wallParts(tz);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

/** Hora (0-23) actual del salón */
export function wallHour(tz = SALON_TZ): number {
  return wallParts(tz).h;
}

/** 'YYYY-MM' de un instante ISO según el reloj del salón */
export function monthKeyTz(iso: string, tz = SALON_TZ): string {
  return new Date(iso)
    .toLocaleDateString("en-CA", { timeZone: tz })
    .slice(0, 7);
}
