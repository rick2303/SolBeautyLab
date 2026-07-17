"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/PageHeader";
import { Modal, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { ROLE_LABEL } from "@/lib/roles";
import { saveWorkHours } from "./actions";
import type { Profile, WorkHours } from "@/lib/types";

// Semana visual lunes→domingo (las llaves siguen el formato de opening_hours)
const WEEK: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type Member = Pick<
  Profile,
  "id" | "full_name" | "role" | "specialty" | "work_hours"
>;

export function ScheduleClient({
  me,
  team,
  salonHours,
}: {
  me: Profile;
  team: Member[] | null;
  salonHours: WorkHours;
}) {
  const [editing, setEditing] = useState<Member | null>(null);
  const { t } = useLang();

  // Vista staff/recepción: solo su propio editor
  if (!team) {
    return (
      <div className="max-w-[560px]">
        <ScheduleEditorCard member={me} salonHours={salonHours} />
      </div>
    );
  }

  // Vista owner: grilla de todo el equipo, cada quien editable
  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => (
          <Card key={m.id} className="p-[18px]">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="text-[14px] font-medium">{m.full_name}</div>
                <div className="text-[11px] text-muted">
                  {t(ROLE_LABEL[m.role])}
                  {m.specialty ? ` · ${m.specialty}` : ""}
                </div>
              </div>
              <button
                onClick={() => setEditing(m)}
                className="h-7 cursor-pointer rounded-[20px] border border-chip-border bg-card px-3 text-[11px] font-medium text-gold-dark"
              >
                {t("Edit schedule")}
              </button>
            </div>
            <WeekSummary hours={m.work_hours} salonHours={salonHours} />
          </Card>
        ))}
      </div>

      {editing && (
        <ScheduleEditorModal
          member={editing}
          salonHours={salonHours}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function WeekSummary({
  hours,
  salonHours,
}: {
  hours: WorkHours | null;
  salonHours: WorkHours;
}) {
  const { t } = useLang();
  return (
    <div className="mt-2 flex flex-col gap-[3px]">
      <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.05em] text-faint">
        {hours === null ? t("Using salon hours") : t("Custom schedule")}
      </div>
      {WEEK.map(({ key, label }) => {
        const day = hours === null ? salonHours[key] : (hours[key] ?? null);
        return (
          <div key={key} className="flex justify-between text-[11.5px]">
            <span className="text-muted">{t(label)}</span>
            {day ? (
              <span>
                {day[0]} – {day[1]}
              </span>
            ) : (
              <span className="text-faint">{t("Closed")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Estado editable de la semana; null en un día = cerrado */
type DraftDay = { on: boolean; start: string; end: string };
type Draft = Record<string, DraftDay>;

function draftFrom(hours: WorkHours | null, salonHours: WorkHours): Draft {
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

function ScheduleEditor({
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
          {WEEK.map(({ key, label }) => {
            const d = draft[key];
            const salon = salonHours[key] ?? null;
            return (
              <div key={key} className="flex items-center gap-2.5">
                <button
                  onClick={() => setDay(key, { on: !d.on })}
                  className={`h-9 w-[104px] flex-none cursor-pointer rounded-[10px] border text-[12px] ${
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
                      className={`${inputCls} !h-9 flex-1 !px-2 text-center`}
                    />
                    <span className="text-faint">–</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => setDay(key, { end: e.target.value })}
                      className={`${inputCls} !h-9 flex-1 !px-2 text-center`}
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
        </div>
      )}

      <PrimaryBtn onClick={save} loading={saving} className="mt-2">
        {t("Save schedule")}
      </PrimaryBtn>
    </>
  );
}

function ScheduleEditorCard({
  member,
  salonHours,
}: {
  member: Profile;
  salonHours: WorkHours;
}) {
  const { t } = useLang();
  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="font-serif text-lg font-semibold">{t("My schedule")}</div>
      <ScheduleEditor member={member} salonHours={salonHours} />
    </Card>
  );
}

function ScheduleEditorModal({
  member,
  salonHours,
  onClose,
}: {
  member: Member;
  salonHours: WorkHours;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <Modal
      title={member.full_name}
      onClose={onClose}
      width={480}
      footer={
        <GhostBtn onClick={onClose} className="flex-1">
          {t("Close")}
        </GhostBtn>
      }
    >
      <ScheduleEditor member={member} salonHours={salonHours} onSaved={onClose} />
    </Modal>
  );
}
