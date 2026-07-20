"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, PrimaryBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { saveWorkHours } from "@/app/(app)/schedule/actions";
import type { Profile, WorkHours } from "@/lib/types";

// Semana visual lunes→domingo (las llaves siguen el formato de opening_hours)
export const WEEK: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

/** Estado editable de la semana; un día apagado = cerrado */
export type DraftDay = { on: boolean; start: string; end: string };
export type Draft = Record<string, DraftDay>;

export function draftFrom(hours: WorkHours | null, salonHours: WorkHours): Draft {
  const base = hours ?? salonHours;
  const out: Draft = {};
  for (const { key } of WEEK) {
    const d = base[key] ?? null;
    out[key] = d
      ? { on: true, start: d[0], end: d[1] }
      : { on: false, start: "09:00", end: "18:00" };
  }
  return out;
}

export function WeekDraftFields({
  draft,
  setDay,
  salonHours,
}: {
  draft: Draft;
  setDay: (key: string, patch: Partial<DraftDay>) => void;
  salonHours?: WorkHours;
}) {
  const { t } = useLang();
  return (
    <>
      {WEEK.map(({ key, label }) => {
        const d = draft[key];
        const salon = salonHours?.[key] ?? null;
        return (
          <div key={key} className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => setDay(key, { on: !d.on })}
              className={`h-9 w-[80px] flex-none cursor-pointer truncate rounded-[10px] border px-1 text-[11.5px] sm:w-[104px] sm:text-[12px] ${
                d.on
                  ? "border-gold-light bg-gold-pale font-medium text-gold-deep"
                  : "border-line-2 bg-card text-faint"
              }`}
            >
              {t(label)}
            </button>
            {d.on ? (
              <>
                <input
                  type="time"
                  value={d.start}
                  onChange={(e) => setDay(key, { start: e.target.value })}
                  className={`${inputCls} !h-9 min-w-0 flex-1 !px-2.5 !text-[13px]`}
                />
                <span className="flex-none text-faint">–</span>
                <input
                  type="time"
                  value={d.end}
                  onChange={(e) => setDay(key, { end: e.target.value })}
                  className={`${inputCls} !h-9 min-w-0 flex-1 !px-2.5 !text-[13px]`}
                />
              </>
            ) : (
              <span className="flex-1 text-[11.5px] text-faint">
                {t("Closed")}
                {salon && (
                  <span className="ml-2 text-[10.5px]">
                    {t("Salon:")} {salon[0]} – {salon[1]}
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Editor del horario semanal de un miembro (usa/salón u horario propio) */
export function WorkHoursEditor({
  member,
  salonHours,
  onSaved,
}: {
  member: Pick<Profile, "id" | "work_hours">;
  salonHours: WorkHours;
  onSaved?: () => void;
}) {
  const [custom, setCustom] = useState(member.work_hours !== null);
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(member.work_hours, salonHours)
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  function setDay(key: string, patch: Partial<DraftDay>) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function save() {
    let hours: WorkHours | null = null;
    if (custom) {
      hours = {};
      for (const { key, label } of WEEK) {
        const d = draft[key];
        if (!d.on) {
          hours[key] = null;
          continue;
        }
        if (d.start >= d.end) {
          toast(`${t(label)}: ${t("Start must be before end")}`);
          return;
        }
        hours[key] = [d.start, d.end];
      }
    }
    setSaving(true);
    const res = await saveWorkHours(member.id, hours);
    setSaving(false);
    if (res.error) {
      toast(res.error);
      return;
    }
    toast(t("Schedule saved"));
    router.refresh();
    onSaved?.();
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setCustom(false)}
          className={`h-8 flex-1 cursor-pointer rounded-[10px] border text-[12px] font-medium ${
            !custom
              ? "border-gold-light bg-gold-pale text-gold-deep"
              : "border-line-2 bg-card text-muted"
          }`}
        >
          {t("Use salon hours")}
        </button>
        <button
          onClick={() => setCustom(true)}
          className={`h-8 flex-1 cursor-pointer rounded-[10px] border text-[12px] font-medium ${
            custom
              ? "border-gold-light bg-gold-pale text-gold-deep"
              : "border-line-2 bg-card text-muted"
          }`}
        >
          {t("Set custom schedule")}
        </button>
      </div>

      {custom && (
        <div className="mt-1 flex flex-col gap-2">
          <WeekDraftFields draft={draft} setDay={setDay} salonHours={salonHours} />
        </div>
      )}

      <PrimaryBtn onClick={save} loading={saving} className="mt-2">
        {t("Save schedule")}
      </PrimaryBtn>
    </>
  );
}
