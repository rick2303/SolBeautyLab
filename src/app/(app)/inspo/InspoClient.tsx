"use client";

import { useState } from "react";
import { Card } from "@/components/PageHeader";
import { InspoBoardModal } from "./InspoBoardModal";
import { fmtDateShort, fmtTime, STATUS_LABEL, STATUS_META } from "@/lib/format";
import { useLang } from "@/components/LangProvider";
import type { AppointmentFull, AppointmentStatus } from "@/lib/types";

// Borde por estado: verde = completada, gris = agendada, rojo = el resto
const BORDER_BY_STATUS: Record<AppointmentStatus, string> = {
  completed: "#8fc49b",
  scheduled: "#d6cfc4",
  confirmed: "#dbaaaa",
  in_progress: "#dbaaaa",
  cancelled: "#dbaaaa",
  no_show: "#dbaaaa",
};

export function InspoClient({ appts }: { appts: AppointmentFull[] }) {
  const [sel, setSel] = useState<AppointmentFull | null>(null);
  const { t } = useLang();

  if (appts.length === 0)
    return (
      <Card className="p-8 text-center text-[12.5px] text-faint">
        {t("No appointments in the last 30 days or coming up")}
      </Card>
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {appts.map((a) => {
          const m = STATUS_META[a.status];
          return (
            <div
              key={a.id}
              onClick={() => setSel(a)}
              className="anim-fade flex cursor-pointer items-center gap-3.5 rounded-[16px] bg-card p-3.5 transition-transform hover:scale-[1.01]"
              style={{ border: `1.5px solid ${BORDER_BY_STATUS[a.status]}` }}
            >
              <div className="w-[64px] text-[12.5px] font-medium text-[#8a8178]">
                <div>{fmtDateShort(a.starts_at)}</div>
                <div className="text-[10.5px] text-faint">{fmtTime(a.starts_at)}</div>
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium">
                  {a.clients?.full_name ?? "Client"}
                </div>
                <div className="text-[11px] text-muted">
                  {a.services?.name} · {a.profiles?.full_name?.split(" ")[0]}
                </div>
              </div>
              <span
                className="rounded-[20px] px-2.5 py-1 text-[10.5px]"
                style={{ background: m.bg, color: m.color }}
              >
                {t(STATUS_LABEL[a.status])}
              </span>
            </div>
          );
        })}
      </div>

      {sel && <InspoBoardModal appt={sel} onClose={() => setSel(null)} />}
    </>
  );
}
