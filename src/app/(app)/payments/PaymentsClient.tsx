"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, createFreshClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import {
  avatarFor,
  fmtDateShort,
  fmtMoney,
  fmtTime,
  initialsOf,
  METHOD_CHIP,
  METHOD_LABEL,
} from "@/lib/format";
import type { Client, PaymentMethod, Profile } from "@/lib/types";

interface PaymentRow {
  id: string;
  client_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  staff_id: string | null;
  clients: { full_name: string } | null;
  appointments: {
    staff_id: string | null;
    services: { name: string } | null;
    tech: { full_name: string } | null;
  } | null;
  staff: { full_name: string } | null;
}

/** A quién le cuenta el ingreso: pago asignado > técnico de la cita */
function techOf(p: PaymentRow): { id: string | null; name: string | null } {
  if (p.staff_id) return { id: p.staff_id, name: p.staff?.full_name ?? null };
  if (p.appointments?.staff_id)
    return {
      id: p.appointments.staff_id,
      name: p.appointments.tech?.full_name ?? null,
    };
  return { id: null, name: null };
}

const METHODS: PaymentMethod[] = ["cash", "card", "zelle", "venmo", "transfer"];

export function PaymentsClient({
  payments,
  clients,
  staff,
  me,
}: {
  payments: PaymentRow[];
  clients: Pick<Client, "id" | "full_name">[];
  staff: Pick<Profile, "id" | "full_name">[];
  me: Profile;
}) {
  const [open, setOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [page, setPage] = useState(0);
  // Aviso tras registrar un pago a nombre de otra persona: como ese pago no
  // aparecerá en el historial ni en los ingresos de quien lo creó, se le
  // confirma explícitamente a quién y por cuánto quedó registrado.
  const [notice, setNotice] = useState<{ name: string; amount: number } | null>(
    null
  );
  const { t } = useLang();

  const visible = clientFilter
    ? payments.filter((p) => p.client_id === clientFilter)
    : payments;
  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="font-serif text-[19px] font-semibold">
          {t("Payment history")}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setPage(0);
            }}
            className="h-9 rounded-[20px] border border-[#ece2d0] bg-card px-3 text-[12.5px] text-body outline-none"
          >
            <option value="">{t("All clients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOpen(true)}
            className="grad-gold h-9 cursor-pointer rounded-[20px] border-none px-4 text-[12.5px] font-medium text-white"
          >
            {t("+ Record payment")}
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-line bg-card">
        {visible.length === 0 && (
          <div className="py-10 text-center text-[13px] text-faint">
            {clientFilter
              ? t("No payments for this client")
              : t("No payments recorded yet")}
          </div>
        )}
        {pageItems.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3.5 border-t border-line-4 px-[18px] py-[13px] first:border-t-0"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ background: avatarFor(p.client_id) }}
            >
              {initialsOf(p.clients?.full_name ?? "?")}
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-medium">
                {p.clients?.full_name ?? t("Client")}
              </div>
              <div className="text-[11px] text-muted">
                {p.appointments?.services?.name ?? "—"}
                {(() => {
                  const tech = techOf(p);
                  return tech.name && tech.id !== me.id ? (
                    <> · ✧ {tech.name}</>
                  ) : null;
                })()}
              </div>
            </div>
            <span
              className="rounded-[20px] px-2.5 py-1 text-[10.5px]"
              style={METHOD_CHIP[p.method]}
            >
              {t(METHOD_LABEL[p.method])}
            </span>
            <div className="w-[70px] text-right text-[11.5px] text-muted">
              {fmtDateShort(p.paid_at)}
            </div>
            <div className="w-20 text-right font-serif text-[15px] font-semibold">
              {fmtMoney(Number(p.amount))}
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} total={visible.length} onChange={setPage} />
      {open && (
        <RecordPaymentModal
          clients={clients}
          staff={staff}
          me={me}
          onClose={() => setOpen(false)}
          onAssignedToOther={(name, amount) => setNotice({ name, amount })}
          onSaved={() => {
            // El pago nuevo siempre queda en la primera página (orden por
            // fecha desc); si no, el usuario cree que no se guardó
            setPage(0);
          }}
        />
      )}
      {notice && (
        <Modal
          title={t("Payment recorded")}
          onClose={() => setNotice(null)}
          width={400}
          footer={
            <PrimaryBtn onClick={() => setNotice(null)} className="flex-1">
              {t("Got it")}
            </PrimaryBtn>
          }
        >
          <p className="text-[13.5px] leading-relaxed text-body">
            {t("A payment was recorded for")}{" "}
            <b>{notice.name}</b> · <b>{fmtMoney(notice.amount)}</b>
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {t(
              "It counts as income for that person and for the business — it won't appear in your payment history or your income."
            )}
          </p>
        </Modal>
      )}
    </>
  );
}

function RecordPaymentModal({
  clients,
  staff,
  me,
  onClose,
  onAssignedToOther,
  onSaved,
}: {
  clients: Pick<Client, "id" | "full_name">[];
  staff: Pick<Profile, "id" | "full_name">[];
  me: Profile;
  onClose: () => void;
  onAssignedToOther: (name: string, amount: number) => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [staffId, setStaffId] = useState(me.id);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);
  const [activeAppt, setActiveAppt] = useState<{
    id: string;
    starts_at: string;
    price: number;
    staff_id: string;
    services: { name: string } | null;
    profiles: { full_name: string } | null;
  } | null>(null);
  // ¿Este pago corresponde a la cita en curso? (desmarcar para propinas,
  // productos u otros cobros que no deben completar la cita)
  const [linkAppt, setLinkAppt] = useState(true);
  const [apptHasConsent, setApptHasConsent] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  // ¿La clienta tiene una cita activa (empezada y sin completar)? Se vincula
  // el pago a esa cita y al guardar se marca como completada — así el equipo
  // no depende de ir al calendario a cambiar el estado.
  useEffect(() => {
    if (!clientId) {
      setActiveAppt(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("appointments")
          .select(
            "id, starts_at, price, staff_id, services(name), profiles!staff_id(full_name)"
          )
          .eq("client_id", clientId)
          .in("status", ["scheduled", "confirmed", "in_progress"])
          .gte("starts_at", new Date(Date.now() - 12 * 3600000).toISOString())
          .lte("starts_at", new Date(Date.now() + 15 * 60000).toISOString())
          .order("starts_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const a = (data?.[0] as unknown as typeof activeAppt) ?? null;
        setActiveAppt(a);
        setLinkAppt(true);
        if (a) {
          // Precarga el técnico y el precio del servicio (editables)
          setStaffId(a.staff_id);
          setAmount((prev) => (prev.trim() ? prev : String(a.price)));
          // ¿Esa cita ya tiene ficha firmada? (si la mig 025 falta, ignora)
          const { data: cons } = await supabase
            .from("client_consents")
            .select("id")
            .eq("appointment_id", a.id)
            .limit(1);
          if (!cancelled) setApptHasConsent((cons ?? []).length > 0);
        }
      } catch {
        // Red intermitente (móvil): sin la cita activa el pago igual funciona
        if (!cancelled) setActiveAppt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function save() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    if (!clientId || !amt) {
      toast(t("Add client & amount"));
      return;
    }
    setSaving(true);
    // Sesión garantizada fresca: en Android PWA el token puede llegar
    // caducado tras estar en segundo plano y el insert fallaba
    const supabase = await createFreshClient();
    const linked = activeAppt && linkAppt ? activeAppt : null;
    // Si el pago va ligado a la cita y el ingreso es para su técnico, se
    // guarda SIN staff_id (la atribución sale de la cita): así quien lo
    // registró lo sigue viendo y el botón "Cobrar" no reaparece (mig 023).
    const storedStaffId = linked && staffId === linked.staff_id ? null : staffId;
    const { error } = await supabase.from("payments").insert({
      client_id: clientId,
      amount: amt,
      method,
      recorded_by: me.id,
      staff_id: storedStaffId,
      // Vincula el pago a la cita activa (así aparece el servicio en la lista)
      ...(linked ? { appointment_id: linked.id } : {}),
    });
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    // Cierra el ciclo: la cita activa queda completada (y la visita cuenta)
    let apptDone = false;
    if (linked) {
      const { error: upErr } = await supabase
        .from("appointments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", linked.id);
      if (upErr) {
        toast(t("Couldn't update the appointment status:") + " " + upErr.message);
      } else {
        apptDone = true;
      }
    }
    // Si el pago quedó a nombre de otra persona y quien lo creó no es la
    // dueña, RLS se lo oculta de inmediato: en vez del toast normal se abre
    // un aviso con el nombre y el monto para que sepa que sí se guardó.
    // (Solo aplica si de verdad se guardó staff_id: ligado a la cita del
    // técnico, el pago sigue visible para quien lo registró.)
    if (storedStaffId && storedStaffId !== me.id && me.role !== "owner") {
      const name =
        staff.find((s) => s.id === staffId)?.full_name ?? t("Staff");
      onAssignedToOther(name, amt);
    } else if (apptDone) {
      toast(`✓ ${t("Payment recorded")} · ${t("Appointment marked as completed")}`);
    } else {
      toast(t("Payment recorded"));
    }
    onSaved();
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Record payment")}
      onClose={onClose}
      width={420}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save payment")}
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
      {activeAppt && (
        <div className="rounded-[10px] border border-[#e4c97e] bg-[#fdf7e8] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#8a6526]">
          ◷ <b>{t("Appointment in progress")}</b>:{" "}
          {activeAppt.services?.name ?? "—"} ·{" "}
          {activeAppt.profiles?.full_name?.split(" ")[0]} ·{" "}
          {fmtTime(activeAppt.starts_at)}
          <label className="mt-1.5 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={linkAppt}
              onChange={() => setLinkAppt(!linkAppt)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#b0863c]"
            />
            <span className="font-medium">
              {t("This payment is for this appointment — mark it as completed")}
            </span>
          </label>
          {!linkAppt && (
            <div className="mt-1 text-[11px]">
              {t("The appointment will stay as is (tips, products, other charges)")}
            </div>
          )}
          {linkAppt && !apptHasConsent && (
            <div className="mt-1 text-[11px] font-medium text-[#a05a5a]">
              ✎ {t("This appointment has no signed consent form — ask for it before finishing")}
            </div>
          )}
        </div>
      )}
      <Field label={t("Income for")}>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className={inputCls}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.id === me.id ? ` ${t("(you)")}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("Amount")}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          className={inputCls}
        />
      </Field>
      <Field label={t("Method")}>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`h-9 cursor-pointer rounded-[20px] px-4 text-[12.5px] ${
                method === m
                  ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                  : "border border-input bg-white text-[#8a8178]"
              }`}
            >
              {t(METHOD_LABEL[m])}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}
