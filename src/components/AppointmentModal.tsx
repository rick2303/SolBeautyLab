"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { fmtMoney, fmtTime } from "@/lib/format";
import { effectiveDayHours, toMin, DOW_KEYS } from "@/lib/schedule";
import { DepositField, uploadDeposit } from "@/components/DepositField";
import { notifyInternalAppointment } from "@/app/(app)/appointment-actions";
import type { Client, Profile, Service, WorkHours } from "@/lib/types";

export function AppointmentModal({
  clients,
  services,
  staff,
  me,
  defaultClientId,
  onClose,
}: {
  clients: Pick<Client, "id" | "full_name">[];
  services: Pick<Service, "id" | "name" | "price" | "duration_min">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
  me: Profile;
  defaultClientId?: string;
  onClose: () => void;
}) {
  const isStaff = me.role === "staff";
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(isStaff ? me.id : staff[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [depositPreview, setDepositPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [salonHours, setSalonHours] = useState<WorkHours | null>(null);
  const [techHours, setTechHours] = useState<WorkHours | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("salon_settings")
      .select("opening_hours")
      .limit(1)
      .then(({ data }) => setSalonHours((data?.[0]?.opening_hours as WorkHours) ?? {}));
  }, []);

  useEffect(() => {
    if (!staffId) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("work_hours")
      .eq("id", staffId)
      .single()
      .then(({ data }) => setTechHours((data?.work_hours as WorkHours | null) ?? null));
  }, [staffId]);

  // Aviso (no bloqueo): la cita cae fuera del horario del técnico
  const outsideHours = useMemo(() => {
    if (!salonHours) return false;
    const service = services.find((s) => s.id === serviceId);
    const d = new Date(`${date}T${time}:00`);
    if (isNaN(d.getTime())) return false;
    const dow = DOW_KEYS[d.getDay()];
    const win = effectiveDayHours(salonHours[dow] ?? null, techHours, dow);
    if (!win) return true;
    const startMin = d.getHours() * 60 + d.getMinutes();
    const endMin = startMin + (service?.duration_min ?? 0);
    return startMin < toMin(win[0]) || endMin > toMin(win[1]);
  }, [salonHours, techHours, date, time, serviceId, services]);

  async function save() {
    const service = services.find((s) => s.id === serviceId);
    if (!clientId || !service || !staffId) {
      toast(t("Pick client, service & tech"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const starts = new Date(`${date}T${time}:00`);
    const ends = new Date(starts.getTime() + service.duration_min * 60000);

    // Prevención de doble reserva: citas activas del técnico ese día
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const { data: existing } = await supabase
      .from("appointments")
      .select("starts_at, duration_min, clients(full_name)")
      .eq("staff_id", staffId)
      .in("status", ["scheduled", "confirmed", "in_progress"])
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString());
    const conflict = (existing ?? []).find((a) => {
      const aStart = new Date(a.starts_at);
      const aEnd = new Date(aStart.getTime() + a.duration_min * 60000);
      return starts < aEnd && aStart < ends;
    });
    if (conflict) {
      setSaving(false);
      const who =
        (conflict.clients as unknown as { full_name: string } | null)
          ?.full_name ?? t("Client");
      toast(
        `⚠︎ ${t("Time conflict")}: ${who} · ${fmtTime(conflict.starts_at)}`
      );
      return;
    }

    // Sube el comprobante de depósito (si adjuntaron uno). No bloquea la
    // cita: si la subida falla, se agenda igual sin comprobante.
    let depositUrl: string | null = null;
    if (depositFile) {
      depositUrl = await uploadDeposit(depositFile);
      if (!depositUrl) toast(t("Couldn't attach the receipt, booking anyway"));
    }

    const { data: created, error } = await supabase
      .from("appointments")
      .insert({
        client_id: clientId,
        service_id: service.id,
        staff_id: staffId,
        starts_at: starts.toISOString(),
        duration_min: service.duration_min,
        price: service.price,
        status: "scheduled",
        created_by: me.id,
        // Solo si hay comprobante: así una cita normal no se rompe aunque
        // la migración 022 aún no se haya corrido.
        ...(depositUrl ? { deposit_url: depositUrl } : {}),
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !created) {
      toast(t("Could not book:") + " " + (error?.message ?? ""));
      return;
    }
    // Manda el SMS de confirmación al cliente + avisa al staff (no bloquea)
    notifyInternalAppointment(created.id);
    toast(t("Appointment booked"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("New appointment")}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Booking…") : t("Create appointment")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Client")}>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={inputCls}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("Service")}>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={inputCls}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {fmtMoney(s.price)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("Technician")}>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          disabled={isStaff}
          className={inputCls}
        >
          {(isStaff ? staff.filter((s) => s.id === me.id) : staff).map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label={t("Date")}>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label={t("Time")}>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      {outsideHours && (
        <div className="rounded-[10px] border border-[#e4c97e] bg-[#fdf7e8] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#8a6526]">
          ⚠︎{" "}
          {t(
            "Outside this technician's working hours — you can still book it, but online clients can't"
          )}
        </div>
      )}
      <Field label={t("Deposit receipt (optional)")}>
        <DepositField
          preview={depositPreview}
          label={t("Attach deposit receipt")}
          onPick={(file, url) => {
            setDepositFile(file);
            setDepositPreview(url);
          }}
          onClear={() => {
            setDepositFile(null);
            setDepositPreview(null);
          }}
          disabled={saving}
        />
      </Field>
    </Modal>
  );
}
