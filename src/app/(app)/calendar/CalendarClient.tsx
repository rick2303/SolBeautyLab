"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ApptDetailModal } from "@/components/ApptDetailModal";
import { dateKey, fmtTime, STATUS_META } from "@/lib/format";
import { canAccess } from "@/lib/roles";
import { useLang } from "@/components/LangProvider";
import type { AppointmentFull, Profile } from "@/lib/types";

const VIEW_LABEL: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

type View = "day" | "week" | "month";

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7; // lunes = 0
  r.setDate(r.getDate() - dow);
  return r;
}

/** Colores por técnico para el calendario de equipo */
const TEAM_COLORS = [
  { bar: "#8a6526", bg: "#f6edd8", text: "#6b4f1d" },
  { bar: "#7a5a9f", bg: "#efe9f7", text: "#5d4478" },
  { bar: "#3a7a8a", bg: "#e4f0f4", text: "#2d5f6c" },
  { bar: "#a05a5a", bg: "#f7e9e9", text: "#7d4646" },
  { bar: "#4a7d57", bg: "#e9f4ec", text: "#3a6144" },
  { bar: "#4a6a9f", bg: "#e8eef7", text: "#3a527a" },
  { bar: "#b0863c", bg: "#f7efd9", text: "#8a6526" },
  { bar: "#6f6455", bg: "#efece6", text: "#544c40" },
];

export function CalendarClient({ me }: { me: Profile }) {
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [appts, setAppts] = useState<AppointmentFull[]>([]);
  const [sel, setSel] = useState<AppointmentFull | null>(null);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const { lang, t } = useLang();
  const locale = lang === "es" ? "es" : "en-US";

  const canSeeAll = canAccess(me, "calendar_all");

  // Equipo activo (para leyenda, filtro y colores)
  useEffect(() => {
    if (!canSeeAll) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => setStaff(data ?? []));
  }, [canSeeAll]);

  const colorFor = useCallback(
    (staffId: string) => {
      const i = staff.findIndex((s) => s.id === staffId);
      return TEAM_COLORS[(i < 0 ? 0 : i) % TEAM_COLORS.length];
    },
    [staff]
  );

  /** Estilo del bloque: color por técnico en vista de equipo; por estado en agenda propia */
  const blockStyle = useCallback(
    (a: AppointmentFull): React.CSSProperties => {
      const dim = a.status === "cancelled" || a.status === "no_show";
      if (canSeeAll && staff.length > 0) {
        const c = colorFor(a.staff_id);
        return {
          background: c.bg,
          color: c.text,
          borderLeft: `3px solid ${c.bar}`,
          opacity: dim ? 0.45 : 1,
        };
      }
      return { ...STATUS_META[a.status].block, opacity: dim ? 0.6 : 1 };
    },
    [canSeeAll, staff.length, colorFor]
  );

  // Rango a consultar según vista
  const range = useMemo(() => {
    if (view === "day") {
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return { from, to };
    }
    if (view === "week") {
      const from = startOfWeek(anchor);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return { from, to };
    }
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { from, to };
  }, [view, anchor]);

  const load = useCallback(async () => {
    const supabase = createClient();
    let q = supabase
      .from("appointments")
      .select("*, clients(full_name), services(name), profiles!staff_id(full_name)")
      .gte("starts_at", range.from.toISOString())
      .lt("starts_at", range.to.toISOString())
      .order("starts_at");
    if (!canSeeAll) q = q.eq("staff_id", me.id);
    else if (staffFilter !== "all") q = q.eq("staff_id", staffFilter);
    const { data } = await q;
    setAppts((data ?? []) as unknown as AppointmentFull[]);
  }, [range, me.id, canSeeAll, staffFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(dir: 1 | -1) {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  }

  const rangeLabel =
    view === "day"
      ? anchor.toLocaleDateString(locale, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : view === "week"
      ? (() => {
          const s = startOfWeek(anchor);
          const e = new Date(s);
          e.setDate(e.getDate() + 6);
          // Pedir {day, year} sin mes no tiene formato estándar: el navegador
          // devolvía cosas como "2026 (day: 19)". Se arma el rango a mano.
          const sameMonth = s.getMonth() === e.getMonth();
          const from = s.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          });
          const to = e.toLocaleDateString(
            locale,
            sameMonth
              ? { day: "numeric", month: undefined }
              : { month: "short", day: "numeric" }
          );
          return `${from} – ${to}, ${e.getFullYear()}`;
        })()
      : anchor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const m = new Map<string, AppointmentFull[]>();
    for (const a of appts) {
      const k = dateKey(new Date(a.starts_at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [appts]);

  const todayKey = dateKey(new Date());

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex gap-1.5 rounded-xl bg-tan p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`cursor-pointer rounded-[9px] border-none px-4 py-[7px] text-[12.5px] ${
                view === v
                  ? "bg-card font-medium text-gold-dark shadow-sm"
                  : "bg-transparent text-[#8a8178]"
              }`}
            >
              {t(VIEW_LABEL[v])}
            </button>
          ))}
        </div>
        {/* En móvil ocupa el ancho completo y el título se encoge, si no el
            botón "Today" quedaba cortado fuera de la pantalla */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <button
            onClick={() => shift(-1)}
            className="h-8 w-8 flex-none cursor-pointer rounded-full border border-line-2 bg-card text-body"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center text-[13px] font-medium text-body sm:min-w-[210px] sm:flex-none">
            {rangeLabel}
          </div>
          <button
            onClick={() => shift(1)}
            className="h-8 w-8 flex-none cursor-pointer rounded-full border border-line-2 bg-card text-body"
          >
            ›
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="h-8 flex-none cursor-pointer rounded-full border border-chip-border bg-card px-3.5 text-xs text-gold-dark"
          >
            {t("Today")}
          </button>
        </div>
      </div>

      {/* Filtro / leyenda por técnico (vista de equipo) */}
      {canSeeAll && staff.length > 1 && (
        <div className="anim-fade mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStaffFilter("all")}
            className={`h-8 cursor-pointer rounded-[20px] px-3.5 text-[12px] ${
              staffFilter === "all"
                ? "grad-gold border border-transparent font-medium text-white"
                : "border border-line-2 bg-card text-body"
            }`}
          >
            {t("All team")}
          </button>
          {staff.map((s, i) => {
            const c = TEAM_COLORS[i % TEAM_COLORS.length];
            const active = staffFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStaffFilter(active ? "all" : s.id)}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[20px] px-3 text-[12px] ${
                  active
                    ? "border font-medium"
                    : "border border-line-2 bg-card text-body"
                }`}
                style={
                  active
                    ? { background: c.bg, borderColor: c.bar, color: c.text }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c.bar }}
                />
                {s.full_name.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* DAY */}
      {view === "day" && (
        <div
          key={`day-${dateKey(anchor)}`}
          className="anim-fade rounded-2xl border border-line bg-card px-[18px] py-2"
        >
          {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => {
            const inHour = appts.filter(
              (a) => new Date(a.starts_at).getHours() === h
            );
            const label = new Date(2000, 0, 1, h).toLocaleTimeString("en-US", {
              hour: "numeric",
            });
            return (
              <div
                key={h}
                className="flex min-h-[56px] gap-4 border-t border-line-3 py-1.5 first:border-t-0"
              >
                <div className="w-14 flex-none pt-0.5 text-[11.5px] text-subtle">
                  {label}
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {inHour.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSel(a)}
                      className="min-w-[180px] cursor-pointer rounded-[10px] px-3 py-2"
                      style={blockStyle(a)}
                    >
                      <div className="text-[12.5px] font-medium">
                        {a.clients?.full_name}
                      </div>
                      <div className="text-[10.5px] opacity-80">
                        {a.services?.name} ·{" "}
                        {a.profiles?.full_name?.split(" ")[0]} ·{" "}
                        {fmtTime(a.starts_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WEEK */}
      {view === "week" && (
        <div
          key={`week-${dateKey(startOfWeek(anchor))}`}
          className="anim-fade overflow-x-auto pb-2"
        >
        <div className="grid min-w-[760px] grid-cols-7 gap-2.5">
          {Array.from({ length: 7 }, (_, i) => {
            const d = startOfWeek(anchor);
            d.setDate(d.getDate() + i);
            const k = dateKey(d);
            const dayAppts = byDay.get(k) ?? [];
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                className="min-h-[230px] rounded-[14px] border border-line bg-card px-2.5 py-3"
              >
                <div className="mb-2.5 text-center">
                  <div className="text-[10.5px] uppercase tracking-[0.05em] text-subtle">
                    {d.toLocaleDateString(locale, { weekday: "short" })}
                  </div>
                  <div
                    className={`font-serif text-[22px] font-semibold ${
                      isToday ? "text-gold-dark" : ""
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayAppts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSel(a)}
                      className="cursor-pointer rounded-lg px-2 py-1.5"
                      style={blockStyle(a)}
                    >
                      <div className="text-[10.5px] font-semibold">
                        {fmtTime(a.starts_at).replace(" ", "")}
                      </div>
                      <div className="truncate text-[10.5px]">
                        {a.clients?.full_name?.split(" ")[0]}
                      </div>
                      {canSeeAll && staffFilter === "all" && (
                        <div className="truncate text-[9px] opacity-70">
                          {a.profiles?.full_name?.split(" ")[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* MONTH */}
      {view === "month" && (
        <div
          key={`month-${anchor.getFullYear()}-${anchor.getMonth()}`}
          className="anim-fade rounded-2xl border border-line bg-card p-4"
        >
          <div className="mb-2 grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <div
                key={w}
                className="text-center text-[10.5px] uppercase tracking-[0.05em] text-subtle"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
              const lead = (first.getDay() + 6) % 7;
              const days = new Date(
                anchor.getFullYear(),
                anchor.getMonth() + 1,
                0
              ).getDate();
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < lead; i++)
                cells.push(<div key={`e${i}`} />);
              for (let d = 1; d <= days; d++) {
                const dt = new Date(anchor.getFullYear(), anchor.getMonth(), d);
                const k = dateKey(dt);
                const n = byDay.get(k)?.length ?? 0;
                const isToday = k === todayKey;
                cells.push(
                  <div
                    key={k}
                    onClick={() => {
                      setAnchor(dt);
                      setView("day");
                    }}
                    className={`min-h-[74px] cursor-pointer rounded-[10px] border px-2 py-[7px] ${
                      isToday
                        ? "border-gold-light bg-gold-pale"
                        : "border-line bg-cream hover:bg-cream-deep"
                    }`}
                  >
                    <div
                      className={`text-xs ${
                        isToday
                          ? "font-semibold text-gold-dark"
                          : "text-body"
                      }`}
                    >
                      {d}
                    </div>
                    {n > 0 && (
                      <div className="mt-[5px] inline-block whitespace-nowrap rounded-[20px] bg-gold-pale px-[7px] py-px text-[9.5px] text-gold-dark">
                        {n}
                        {/* En celdas estrechas el texto se partía y deformaba
                            la píldora: en móvil solo el número */}
                        <span className="hidden sm:inline">
                          {" "}
                          {t(n > 1 ? "appts" : "appt")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {sel && (
        <ApptDetailModal
          appt={sel}
          canCharge={canAccess(me, "payments")}
          onClose={() => {
            setSel(null);
            load();
          }}
        />
      )}
    </>
  );
}
