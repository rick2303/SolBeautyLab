"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import {
  avatarFor,
  fmtDateShort,
  fmtMoney,
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
  clients: { full_name: string } | null;
  appointments: { services: { name: string } | null } | null;
}

const METHODS: PaymentMethod[] = ["cash", "card", "zelle", "venmo", "transfer"];

export function PaymentsClient({
  payments,
  clients,
  me,
}: {
  payments: PaymentRow[];
  clients: Pick<Client, "id" | "full_name">[];
  me: Profile;
}) {
  const [open, setOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [page, setPage] = useState(0);
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
          me={me}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RecordPaymentModal({
  clients,
  me,
  onClose,
}: {
  clients: Pick<Client, "id" | "full_name">[];
  me: Profile;
  onClose: () => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    if (!clientId || !amt) {
      toast(t("Add client & amount"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert({
      client_id: clientId,
      amount: amt,
      method,
      recorded_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Payment recorded"));
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
