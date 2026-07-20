"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { inputCls } from "@/components/ui/Modal";
import { InspoBoardModal } from "./InspoBoardModal";
import { fmtDateShort, fmtTime, STATUS_LABEL, STATUS_META } from "@/lib/format";
import { useLang } from "@/components/LangProvider";
import type { AppointmentFull, AppointmentStatus } from "@/lib/types";

const PER_PAGE = 10;

// Barra de color por estado: verde = completada, gris = agendada, rojo = el resto
const BAR_BY_STATUS: Record<AppointmentStatus, string> = {
  completed: "#8fc49b",
  scheduled: "#d6cfc4",
  confirmed: "#dbaaaa",
  in_progress: "#dbaaaa",
  cancelled: "#dbaaaa",
  no_show: "#dbaaaa",
};

export function InspoClient({
  appts,
  isOwner,
}: {
  appts: AppointmentFull[];
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AppointmentFull | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { t } = useLang();

  // Lista de staff para el filtro de la dueña (derivada de las citas)
  const staffOptions = useMemo(() => {
    if (!isOwner) return [];
    const map = new Map<string, string>();
    for (const a of appts) {
      if (a.staff_id && a.profiles?.full_name) {
        map.set(a.staff_id, a.profiles.full_name);
      }
    }
    return [...map.entries()].sort((x, y) => x[1].localeCompare(y[1]));
  }, [appts, isOwner]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    let out = appts.filter((a) =>
      tab === "upcoming"
        ? new Date(a.starts_at).getTime() >= now
        : new Date(a.starts_at).getTime() < now
    );
    // Próximas: la más cercana primero. Pasadas: la más reciente primero.
    if (tab === "past") out = [...out].reverse();
    if (staffFilter !== "all") out = out.filter((a) => a.staff_id === staffFilter);
    if (q) {
      out = out.filter(
        (a) =>
          (a.clients?.full_name ?? "").toLowerCase().includes(q) ||
          (a.services?.name ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [appts, tab, search, staffFilter]);

  const pageItems = useMemo(
    () => filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [filtered, page]
  );

  // Fotos por tablero: solo se consultan las citas visibles en la página
  useEffect(() => {
    const missing = pageItems.filter((a) => counts[a.id] === undefined);
    if (missing.length === 0) return;
    const supabase = createClient();
    Promise.all(
      missing.map(async (a) => {
        const { data } = await supabase.storage.from("inspo-photos").list(a.id);
        const n = (data ?? []).filter(
          (f) => f.name !== ".emptyFolderPlaceholder"
        ).length;
        return [a.id, n] as const;
      })
    ).then((pairs) =>
      setCounts((c) => ({ ...c, ...Object.fromEntries(pairs) }))
    );
  }, [pageItems, counts]);

  function pickTab(next: "upcoming" | "past") {
    setTab(next);
    setPage(0);
  }

  const upcomingCount = useMemo(
    () =>
      appts.filter((a) => new Date(a.starts_at).getTime() >= Date.now()).length,
    [appts]
  );

  return (
    <>
      <Card className="p-[18px]">
        {/* Toolbar: pestañas + buscador + filtro de staff */}
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-[12px] bg-tan p-0.5">
            {(
              [
                ["upcoming", t("Upcoming"), upcomingCount],
                ["past", t("Last 30 days"), appts.length - upcomingCount],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => pickTab(key)}
                className={`h-8 cursor-pointer rounded-[10px] px-3.5 text-[12px] font-medium ${
                  tab === key
                    ? "bg-card text-gold-dark shadow-sm"
                    : "bg-transparent text-muted"
                }`}
              >
                {label} · {n}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t("Search client or service…")}
            className={`${inputCls} !h-9 min-w-[160px] flex-1 !rounded-[10px] text-[12.5px]`}
          />
          {isOwner && staffOptions.length > 1 && (
            <select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                setPage(0);
              }}
              className={`${inputCls} !h-9 !w-auto !rounded-[10px] text-[12.5px]`}
            >
              <option value="all">{t("All staff")}</option>
              {staffOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Lista */}
        {pageItems.length === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-faint">
            {appts.length === 0
              ? t("No appointments in the last 30 days or coming up")
              : t("No results with these filters")}
          </div>
        ) : (
          pageItems.map((a) => {
            const m = STATUS_META[a.status];
            return (
              <div
                key={a.id}
                onClick={() => setSel(a)}
                className="flex cursor-pointer items-center gap-3.5 border-b border-line-3 py-[11px] last:border-b-0 hover:bg-cream"
              >
                <div className="w-[76px] flex-none text-[12.5px] font-medium text-[#8a8178]">
                  <div>{fmtDateShort(a.starts_at)}</div>
                  <div className="text-[10.5px] text-faint">
                    {fmtTime(a.starts_at)}
                  </div>
                </div>
                <div
                  className="h-[34px] w-[5px] flex-none rounded-[3px]"
                  style={{ background: BAR_BY_STATUS[a.status] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">
                    {a.clients?.full_name ?? "Client"}
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {a.services?.name} · {a.profiles?.full_name?.split(" ")[0]}
                  </div>
                </div>
                {(counts[a.id] ?? 0) > 0 && (
                  <span className="flex-none rounded-[20px] bg-gold-pale px-2 py-0.5 text-[10px] font-medium text-gold-deep">
                    ✧ {counts[a.id]}/5
                  </span>
                )}
                <span
                  className="flex-none rounded-[20px] px-2.5 py-1 text-[10.5px]"
                  style={{ background: m.bg, color: m.color }}
                >
                  {t(STATUS_LABEL[a.status])}
                </span>
              </div>
            );
          })
        )}

        <Pagination
          page={page}
          total={filtered.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </Card>

      {sel && (
        <InspoBoardModal
          appt={sel}
          onClose={() => {
            // Invalida el contador de esa cita para refrescarlo al volver
            setCounts((c) => {
              const next = { ...c };
              delete next[sel.id];
              return next;
            });
            setSel(null);
          }}
        />
      )}
    </>
  );
}
