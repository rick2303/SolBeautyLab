"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { fmtMoney } from "@/lib/format";
import { effectiveDayHours, toMin, DOW_KEYS } from "@/lib/schedule";
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
  const [saving, setSaving] = useState(false);
  const [salonHours, setSalonHours] = useState<WorkHours | null>(null);
  const [techHours, setTechHours] = useState<WorkHours | null>(null);
  const toast = useToast();
  const router = useRouter();

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
      toast("Pick client, service & tech");
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
          ?.full_name ?? "another client";
      toast(
        `⚠ Time conflict: this technician has ${who} at ${new Date(conflict.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
      );
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      service_id: service.id,
      staff_id: staffId,
      starts_at: starts.toISOString(),
      duration_min: service.duration_min,
      price: service.price,
      status: "scheduled",
      created_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast("Could not book: " + error.message);
      return;
    }
    toast("Appointment booked");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title="New appointment"
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? "Booking…" : "Create appointment"}
          </PrimaryBtn>
        </>
      }
    >
      <Field label="Client">
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
      <Field label="Service">
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
      <Field label="Technician">
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
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Time">
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
          ⚠ Outside this technician&apos;s working hours — you can still book
          it, but online clients can&apos;t
        </div>
      )}
    </Modal>
  );
}
