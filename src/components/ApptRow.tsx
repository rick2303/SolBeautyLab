"use client";

import { useState } from "react";
import { ApptDetailModal } from "@/components/ApptDetailModal";
import { fmtDateShort, fmtTime, STATUS_LABEL, STATUS_META } from "@/lib/format";
import { useLang } from "@/components/LangProvider";
import type { AppointmentFull } from "@/lib/types";

export function ApptList({
  appts,
  empty,
  showDate = false,
  canCharge = true,
}: {
  appts: AppointmentFull[];
  empty: string;
  showDate?: boolean;
  canCharge?: boolean;
}) {
  const [sel, setSel] = useState<AppointmentFull | null>(null);
  const { t } = useLang();

  if (appts.length === 0)
    return <div className="py-8 text-center text-[12.5px] text-faint">{empty}</div>;

  return (
    <>
      {appts.map((a) => {
        const m = STATUS_META[a.status];
        return (
          <div
            key={a.id}
            onClick={() => setSel(a)}
            className="flex cursor-pointer items-center gap-3.5 border-b border-line-3 py-[11px]"
          >
            <div
              className={`${showDate ? "w-[76px]" : "w-[52px]"} text-[12.5px] font-medium text-[#8a8178]`}
            >
              {showDate ? (
                <>
                  <div>{fmtDateShort(a.starts_at)}</div>
                  <div className="text-[10.5px] text-faint">
                    {fmtTime(a.starts_at)}
                  </div>
                </>
              ) : (
                fmtTime(a.starts_at)
              )}
            </div>
            <div
              className="h-[34px] w-[5px] rounded-[3px]"
              style={{ background: m.bar }}
            />
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
      {sel && (
        <ApptDetailModal
          appt={sel}
          canCharge={canCharge}
          onClose={() => setSel(null)}
        />
      )}
    </>
  );
}
