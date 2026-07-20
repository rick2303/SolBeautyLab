import { SALON_TZ, dayRangeTz, monthRangeTz, utcFromWall, wallParts } from "@/lib/tz";

export type Period = "day" | "week" | "month";

export const PERIODS: Period[] = ["day", "week", "month"];

export function asPeriod(v: string | undefined): Period {
  return v === "day" || v === "week" || v === "month" ? v : "month";
}

/** Rango [from, to) del período, en el reloj del salón */
export function reportRange(period: Period): { from: string; to: string } {
  if (period === "day") return dayRangeTz();
  if (period === "month") return monthRangeTz();

  // Semana: de lunes a lunes, según el día actual del salón
  const w = wallParts(SALON_TZ);
  const ref = new Date(Date.UTC(w.y, w.m - 1, w.d));
  const back = (ref.getUTCDay() + 6) % 7; // 0=lunes
  const mon = new Date(Date.UTC(w.y, w.m - 1, w.d - back));
  const nxt = new Date(Date.UTC(w.y, w.m - 1, w.d - back + 7));
  const at = (d: Date) =>
    utcFromWall(
      SALON_TZ,
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate()
    ).toISOString();
  return { from: at(mon), to: at(nxt) };
}

/** Etiqueta legible del período ("19 jul 2026", "13 – 19 jul", "julio 2026") */
export function rangeLabel(period: Period, locale: string): string {
  const { from, to } = reportRange(period);
  const start = new Date(from);
  const end = new Date(new Date(to).getTime() - 1);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(locale, { ...o, timeZone: SALON_TZ });

  if (period === "day")
    return fmt(start, { weekday: "long", month: "long", day: "numeric" });
  if (period === "week")
    return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  return fmt(start, { month: "long", year: "numeric" });
}
