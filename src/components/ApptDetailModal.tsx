"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { inputCls, ModalShell } from "@/components/ui/Modal";
import {
  fmtMoney,
  fmtTime,
  fmtDate,
  METHOD_LABEL,
  STATUS_LABEL,
  STATUS_META,
} from "@/lib/format";
import type {
  AppointmentFull,
  AppointmentStatus,
  PaymentMethod,
} from "@/lib/types";

const SETTABLE: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

const METHODS: PaymentMethod[] = ["cash", "card", "zelle", "venmo", "transfer"];

export function ApptDetailModal({
  appt,
  onClose,
  canCharge = true,
}: {
  appt: AppointmentFull;
  onClose: () => void;
  canCharge?: boolean;
}) {
  const [status, setStatus] = useState<AppointmentStatus>(appt.status);
  const [mode, setMode] = useState<"status" | "edit" | "charge">("status");
  const [date, setDate] = useState(() => {
    const d = new Date(appt.starts_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [time, setTime] = useState(() => {
    const d = new Date(appt.starts_at);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [staffId, setStaffId] = useState(appt.staff_id);
  const [staffOpts, setStaffOpts] = useState<{ id: string; full_name: string }[]>([]);
  const [amount, setAmount] = useState(String(appt.price));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    if (mode !== "edit" || staffOpts.length > 0) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => setStaffOpts(data ?? []));
  }, [mode, staffOpts.length]);

  // ¿Ya tiene pago registrado esta cita?
  useEffect(() => {
    if (!canCharge) return;
    const supabase = createClient();
    supabase
      .from("payments")
      .select("id")
      .eq("appointment_id", appt.id)
      .limit(1)
      .then(({ data }) => setAlreadyPaid((data ?? []).length > 0));
  }, [appt.id, canCharge]);

  async function apply(st: AppointmentStatus) {
    setStatus(st);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: st, updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    if (error) {
      toast("Update failed: " + error.message);
      return;
    }
    router.refresh();
    // Al completar → ofrecer registrar el cobro (si no está pagada ya)
    if (st === "completed" && canCharge && !alreadyPaid) {
      setMode("charge");
      return;
    }
    toast("Marked " + STATUS_LABEL[st]);
  }

  async function chargeNow() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    if (!amt) {
      toast("Enter the amount");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert({
      appointment_id: appt.id,
      client_id: appt.client_id,
      amount: amt,
      method,
    });
    setSaving(false);
    if (error) {
      toast("Payment failed: " + error.message);
      return;
    }
    toast(`Payment of ${fmtMoney(amt)} recorded ✓`);
    router.refresh();
    onClose();
  }

  async function reschedule() {
    setSaving(true);
    const supabase = createClient();
    const starts = new Date(`${date}T${time}:00`);
    const { error } = await supabase
      .from("appointments")
      .update({
        starts_at: starts.toISOString(),
        staff_id: staffId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appt.id);
    setSaving(false);
    if (error) {
      toast("Update failed: " + error.message);
      return;
    }
    toast("Appointment rescheduled");
    router.refresh();
    onClose();
  }

  return (
    <ModalShell onClose={onClose} width={400}>
      <div className="flex-none border-b border-line-2 px-[22px] py-5">
        <div className="flex items-start justify-between">
          <div className="font-serif text-[22px] font-semibold">
            {appt.clients?.full_name ?? "Client"}
          </div>
          <button
            onClick={onClose}
            className="h-[30px] w-[30px] cursor-pointer rounded-full bg-tan text-sm text-[#8a8178]"
          >
            ✕
          </button>
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted">
          {appt.services?.name} · {appt.profiles?.full_name?.split(" ")[0]}
        </div>
        <div className="mt-1.5 text-[12.5px] text-gold-dark">
          {fmtDate(appt.starts_at)} · {fmtTime(appt.starts_at)} ·{" "}
          {fmtMoney(appt.price)}
          {alreadyPaid && (
            <span className="ml-2 rounded-[20px] bg-[#eaf5ec] px-2 py-0.5 text-[10px] text-[#4a7d57]">
              PAID
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
        {mode === "status" && (
          <>
            <div className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              Set status
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SETTABLE.map((st) => {
                const active = status === st;
                const m = STATUS_META[st];
                return (
                  <button
                    key={st}
                    onClick={() => apply(st)}
                    className="h-10 cursor-pointer rounded-[11px] text-[12.5px]"
                    style={{
                      border: `1px solid ${active ? m.color : "#ece2d0"}`,
                      background: active ? m.bg : "#fff",
                      color: active ? m.color : "#8a8178",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setMode("edit")}
                className="h-[42px] flex-1 cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] font-medium text-gold-dark"
              >
                Reschedule / reassign
              </button>
              {canCharge && status === "completed" && !alreadyPaid && (
                <button
                  onClick={() => setMode("charge")}
                  className="grad-gold h-[42px] flex-1 cursor-pointer rounded-xl border-none text-[13px] font-medium text-white"
                >
                  Charge {fmtMoney(appt.price)}
                </button>
              )}
            </div>
          </>
        )}

        {mode === "charge" && (
          <div className="anim-fade">
            <div className="mb-1 font-serif text-lg font-semibold">
              Service completed ✨
            </div>
            <div className="mb-3.5 text-[12px] text-muted">
              Record the payment for this visit
            </div>
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              Amount
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
            <div className="mb-1.5 mt-3 text-[11px] uppercase tracking-[0.06em] text-muted">
              Method
            </div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`h-9 cursor-pointer rounded-[20px] px-3.5 text-[12.5px] ${
                    method === m
                      ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                      : "border border-input bg-white text-[#8a8178]"
                  }`}
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => {
                  toast("Marked Completed");
                  onClose();
                }}
                className="h-[42px] flex-1 cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] text-[#8a8178]"
              >
                Skip
              </button>
              <button
                onClick={chargeNow}
                disabled={saving}
                className="grad-gold h-[42px] flex-[2] cursor-pointer rounded-xl border-none text-[13px] font-medium text-white disabled:opacity-60"
              >
                {saving && <span className="spinner mr-2" />}
                {saving ? "Saving…" : "Record payment"}
              </button>
            </div>
          </div>
        )}

        {mode === "edit" && (
          <div className="anim-fade">
            <div className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              Reschedule
            </div>
            <div className="flex gap-2.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">
                Technician
              </div>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className={inputCls}
              >
                {staffOpts.length === 0 && (
                  <option value={appt.staff_id}>
                    {appt.profiles?.full_name ?? "Loading…"}
                  </option>
                )}
                {staffOpts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setMode("status")}
                className="h-[42px] flex-1 cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] text-[#8a8178]"
              >
                Back
              </button>
              <button
                onClick={reschedule}
                disabled={saving}
                className="grad-gold h-[42px] flex-[2] cursor-pointer rounded-xl border-none text-[13px] font-medium text-white disabled:opacity-60"
              >
                {saving && <span className="spinner mr-2" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
