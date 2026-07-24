"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, createFreshClient } from "@/lib/supabase/client";
import { checkAppointmentConflicts } from "@/app/(app)/appointment-actions";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { inputCls, ModalShell } from "@/components/ui/Modal";
import { DepositField, uploadDeposit } from "@/components/DepositField";
import {
  ConsentForm,
  ConsentSummary,
  type ConsentPayload,
} from "@/components/ConsentForm";
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
  ClientConsent,
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
  const [mode, setMode] = useState<"status" | "edit" | "charge" | "consent">(
    "status"
  );
  const [clientPhone, setClientPhone] = useState("");
  const [consents, setConsents] = useState<ClientConsent[]>([]);
  // Solo interceptamos estados si la tabla de fichas respondió sin error
  // (si la migración 025 no ha corrido, no molestamos con avisos falsos)
  const [consentsReady, setConsentsReady] = useState(false);
  // Estado que el usuario quiso poner cuando le avisamos que falta la ficha
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(
    null
  );
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
  const [depositUrl, setDepositUrl] = useState<string | null>(appt.deposit_url);
  const [depositBusy, setDepositBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t, lang } = useLang();

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

  // Teléfono del cliente + fichas firmadas (para la ficha de consentimiento).
  // Si la migración 025 no ha corrido, la consulta falla y queda vacío.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("phone")
      .eq("id", appt.client_id)
      .single()
      .then(({ data }) => setClientPhone(data?.phone ?? ""));
    supabase
      .from("client_consents")
      .select("*")
      .eq("client_id", appt.client_id)
      .order("signed_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return;
        setConsents((data as ClientConsent[]) ?? []);
        setConsentsReady(true);
      });
  }, [appt.client_id]);

  const signedThis = consents.find((c) => c.appointment_id === appt.id) ?? null;
  const lastConsent = consents[0] ?? null;

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

  function apply(st: AppointmentStatus) {
    // Aviso (no bloqueo): empezar o completar sin ficha firmada. El usuario
    // decide "Firmar ahora" o "Continuar sin firmar" en el prompt de abajo.
    if (
      consentsReady &&
      !signedThis &&
      (st === "in_progress" || st === "completed")
    ) {
      setPendingStatus(st);
      return;
    }
    doApply(st);
  }

  async function doApply(st: AppointmentStatus) {
    setPendingStatus(null);
    setStatus(st);
    const supabase = await createFreshClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: st, updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    router.refresh();
    // Al completar → ofrecer registrar el cobro (si no está pagada ya)
    if (st === "completed" && canCharge && !alreadyPaid) {
      setMode("charge");
      return;
    }
    toast(t("Marked") + " " + t(STATUS_LABEL[st]));
  }

  async function chargeNow() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    if (!amt) {
      toast(t("Enter the amount"));
      return;
    }
    setSaving(true);
    const supabase = await createFreshClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      appointment_id: appt.id,
      client_id: appt.client_id,
      amount: amt,
      method,
      // Sin esto el pago queda sin dueño y quien lo registró no vuelve a
      // verlo (la política de pagos filtra por técnico o por recorded_by)
      recorded_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast(t("Payment failed:") + " " + error.message);
      return;
    }
    toast(`${t("Payment recorded")} · ${fmtMoney(amt)} ✓`);
    router.refresh();
    onClose();
  }

  async function attachDeposit(file: File) {
    setDepositBusy(true);
    const url = await uploadDeposit(file);
    if (!url) {
      setDepositBusy(false);
      toast(t("Upload failed:") + " ");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ deposit_url: url, updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    setDepositBusy(false);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    setDepositUrl(url);
    toast(t("Deposit receipt saved ✓"));
    router.refresh();
  }

  async function removeDeposit() {
    setDepositBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ deposit_url: null, updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    setDepositBusy(false);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    setDepositUrl(null);
    router.refresh();
  }

  async function saveConsent(p: ConsentPayload) {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const row = {
      client_id: appt.client_id,
      appointment_id: appt.id,
      staff_id: appt.staff_id,
      service_label: appt.services?.name ?? "",
      created_by: user?.id,
      ...p,
    };
    // signer_name = nombre tal como se firmó (mig 026); tolera que la
    // columna aún no exista
    let res = await supabase
      .from("client_consents")
      .insert({ ...row, signer_name: appt.clients?.full_name ?? null })
      .select("*")
      .single();
    if (res.error && /signer_name/i.test(res.error.message)) {
      res = await supabase
        .from("client_consents")
        .insert(row)
        .select("*")
        .single();
    }
    const { data: created, error } = res;
    setSaving(false);
    if (error) {
      toast(t("Could not save the form:") + " " + error.message);
      return;
    }
    setConsents((prev) => [created as ClientConsent, ...prev]);
    toast("✓ " + t("Signed form saved"));
    setMode("status");
    // Si venía de "quiero marcar in progress/completed pero faltaba la
    // ficha", ya firmada se aplica ese estado de una vez
    if (pendingStatus) doApply(pendingStatus);
  }

  async function reschedule() {
    setSaving(true);
    const starts = new Date(`${date}T${time}:00`);
    if (isNaN(starts.getTime())) {
      setSaving(false);
      toast(t("Update failed:") + " " + t("Invalid date"));
      return;
    }
    // Antes reagendar no validaba nada: se podía encimar al técnico o
    // duplicar al cliente. Chequeo en servidor (ve todas las citas).
    const conflicts = await checkAppointmentConflicts({
      staffId,
      clientId: appt.client_id,
      startsISO: starts.toISOString(),
      durationMin: appt.duration_min,
      excludeApptId: appt.id,
    });
    if (conflicts.staff || conflicts.client) {
      setSaving(false);
      const c = conflicts.staff ?? conflicts.client!;
      const label = conflicts.staff
        ? t("Time conflict")
        : t("This client already has an appointment at that time");
      toast(
        `⚠︎ ${label}: ${c.clientName ?? c.serviceName ?? ""} · ${fmtTime(c.startsAt)}`
      );
      return;
    }
    const supabase = await createFreshClient();
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
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    toast(t("Appointment rescheduled"));
    router.refresh();
    onClose();
  }

  return (
    <ModalShell onClose={onClose} width={mode === "consent" ? 640 : 400}>
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
              {t("PAID")}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
        {mode === "status" && (
          <>
            {consentsReady &&
              !signedThis &&
              status !== "cancelled" &&
              status !== "no_show" && (
                <div className="mb-3 rounded-[10px] border border-[#e4c97e] bg-[#fdf7e8] px-3.5 py-2 text-[11.5px] font-medium text-[#8a6526]">
                  ✎ {t("No signed consent form for this service")}
                </div>
              )}
            <div className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              {t("Set status")}
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
                    {t(STATUS_LABEL[st])}
                  </button>
                );
              })}
            </div>
            {pendingStatus && (
              <div className="anim-fade mt-3 rounded-xl border border-[#e4c97e] bg-[#fdf7e8] p-3.5">
                <div className="text-[12.5px] font-medium leading-snug text-[#8a6526]">
                  ✎{" "}
                  {t(
                    "This appointment has no signed consent form. Sign it before starting the service?"
                  )}
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setMode("consent")}
                    className="grad-gold h-9 flex-1 cursor-pointer rounded-[10px] border-none text-[12.5px] font-medium text-white"
                  >
                    {t("Sign it now")}
                  </button>
                  <button
                    onClick={() => doApply(pendingStatus)}
                    className="h-9 flex-1 cursor-pointer rounded-[10px] border border-[#e4c97e] bg-white text-[12.5px] text-[#8a6526]"
                  >
                    {t("Continue without signing")}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setMode("edit")}
                className="h-[42px] flex-1 cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] font-medium text-gold-dark"
              >
                {t("Reschedule / reassign")}
              </button>
              {canCharge && status === "completed" && !alreadyPaid && (
                <button
                  onClick={() => setMode("charge")}
                  className="grad-gold h-[42px] flex-1 cursor-pointer rounded-xl border-none text-[13px] font-medium text-white"
                >
                  {t("Charge")} {fmtMoney(appt.price)}
                </button>
              )}
            </div>

            <button
              onClick={() => setMode("consent")}
              className="mt-2.5 h-[42px] w-full cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] font-medium text-gold-dark"
            >
              {signedThis
                ? `✓ ${t("Consent form")} · ${fmtDate(signedThis.signed_at)}`
                : `✎ ${t("Consent form")}`}
            </button>

            <div className="mt-4 rounded-xl border border-line-2 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.06em] text-muted">
                  {t("Deposit receipt")}
                </div>
                {depositUrl && (
                  <a
                    href={depositUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] font-medium text-gold-dark"
                  >
                    {t("Open")}
                  </a>
                )}
              </div>
              <DepositField
                preview={depositUrl}
                label={t("Attach deposit receipt")}
                onPick={(file) => attachDeposit(file)}
                onClear={removeDeposit}
                disabled={depositBusy}
              />
              {depositBusy && (
                <div className="mt-1 text-[11px] text-muted">{t("Saving…")}</div>
              )}
            </div>
          </>
        )}

        {mode === "charge" && (
          <div className="anim-fade">
            <div className="mb-1 font-serif text-lg font-semibold">
              {t("Service completed ✓")}
            </div>
            <div className="mb-3.5 text-[12px] text-muted">
              {t("Record the payment for this visit")}
            </div>
            {consentsReady && !signedThis && (
              <div className="mb-3 rounded-[10px] border border-[#e4c97e] bg-[#fdf7e8] px-3.5 py-2 text-[11.5px] font-medium text-[#8a6526]">
                ✎ {t("No signed consent form for this service")}
              </div>
            )}
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              {t("Amount")}
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
            <div className="mb-1.5 mt-3 text-[11px] uppercase tracking-[0.06em] text-muted">
              {t("Method")}
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
                  {t(METHOD_LABEL[m])}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => {
                  toast(t("Marked") + " " + t(STATUS_LABEL.completed));
                  onClose();
                }}
                className="h-[42px] flex-1 cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] text-[#8a8178]"
              >
                {t("Skip")}
              </button>
              <button
                onClick={chargeNow}
                disabled={saving}
                className="grad-gold h-[42px] flex-[2] cursor-pointer rounded-xl border-none text-[13px] font-medium text-white disabled:opacity-60"
              >
                {saving && <span className="spinner mr-2" />}
                {saving ? t("Saving…") : t("Record payment")}
              </button>
            </div>
          </div>
        )}

        {mode === "consent" &&
          (signedThis ? (
            // Ya firmada para esta cita: resumen de lectura, no se edita
            <div className="anim-fade flex flex-col gap-3">
              <ConsentSummary consent={signedThis} />
              <button
                onClick={() => setMode("status")}
                className="h-[42px] cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] text-[#8a8178]"
              >
                {t("Back")}
              </button>
            </div>
          ) : (
            <div className="anim-fade">
              <ConsentForm
                clientName={appt.clients?.full_name ?? ""}
                phone={clientPhone}
                serviceLabel={appt.services?.name ?? ""}
                staffName={appt.profiles?.full_name ?? ""}
                lastConsent={lastConsent}
                saving={saving}
                onSubmit={saveConsent}
                onSkip={() => setMode("status")}
              />
            </div>
          ))}

        {mode === "edit" && (
          <div className="anim-fade">
            <div className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-muted">
              {t("Reschedule")}
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
                {t("Technician")}
              </div>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className={inputCls}
              >
                {staffOpts.length === 0 && (
                  <option value={appt.staff_id}>
                    {appt.profiles?.full_name ?? t("Loading…")}
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
                {t("Back")}
              </button>
              <button
                onClick={reschedule}
                disabled={saving}
                className="grad-gold h-[42px] flex-[2] cursor-pointer rounded-xl border-none text-[13px] font-medium text-white disabled:opacity-60"
              >
                {saving && <span className="spinner mr-2" />}
                {saving ? t("Saving…") : t("Save changes")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
