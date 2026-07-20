"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/PageHeader";
import { Modal, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { ROLE_LABEL } from "@/lib/roles";
import {
  WEEK,
  draftFrom,
  WeekDraftFields,
  WorkHoursEditor,
  type Draft,
  type DraftDay,
} from "@/components/WorkHoursEditor";
import type { Profile, WorkHours } from "@/lib/types";

type Member = Pick<
  Profile,
  "id" | "full_name" | "role" | "specialties" | "work_hours"
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
        <Card className="flex flex-col gap-3.5 p-[18px]">
          <div className="font-serif text-lg font-semibold">
            {t("My schedule")}
          </div>
          <WorkHoursEditor member={me} salonHours={salonHours} />
        </Card>
      </div>
    );
  }

  // Vista owner: horario del salón + grilla del equipo
  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <SalonHoursCard salonHours={salonHours} />
        {team.map((m) => (
          <Card key={m.id} className="p-[18px]">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="text-[14px] font-medium">{m.full_name}</div>
                <div className="text-[11px] text-muted">
                  {t(ROLE_LABEL[m.role])}
                  {m.specialties?.length ? ` · ${m.specialties.join(", ")}` : ""}
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
        <Modal
          title={editing.full_name}
          onClose={() => setEditing(null)}
          width={480}
          footer={
            <GhostBtn onClick={() => setEditing(null)} className="flex-1">
              {t("Close")}
            </GhostBtn>
          }
        >
          <WorkHoursEditor
            member={editing}
            salonHours={salonHours}
            onSaved={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}

// ---------- Horario del salón (solo owner) ----------

function SalonHoursCard({ salonHours }: { salonHours: WorkHours }) {
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(salonHours, salonHours)
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  function setDay(key: string, patch: Partial<DraftDay>) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function save() {
    const hours: WorkHours = {};
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
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("salon_settings")
      .update({ opening_hours: hours })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    toast(t("Salon hours saved"));
    router.refresh();
  }

  return (
    <Card className="border-gold-light p-[18px]">
      <div className="mb-1 font-serif text-lg font-semibold text-gold-dark">
        {t("Salon hours")}
      </div>
      <div className="mb-3 text-[11px] leading-relaxed text-muted">
        {t("Online booking only offers times inside these hours")}
      </div>
      <div className="flex flex-col gap-2">
        <WeekDraftFields draft={draft} setDay={setDay} />
      </div>
      <PrimaryBtn onClick={save} loading={saving} className="mt-3.5 w-full">
        {t("Save schedule")}
      </PrimaryBtn>
    </Card>
  );
}

// ---------- Resumen semanal (solo lectura, en la grilla del owner) ----------

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
