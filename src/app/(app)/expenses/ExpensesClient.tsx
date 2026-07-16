"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toaster";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { Expense, ExpenseCategory, Profile } from "@/lib/types";

const CATS: { key: ExpenseCategory; label: string }[] = [
  { key: "supplies", label: "Supplies" },
  { key: "rent", label: "Rent" },
  { key: "marketing", label: "Marketing" },
  { key: "utilities", label: "Utilities" },
  { key: "equipment", label: "Equipment" },
  { key: "other", label: "Other" },
];

export function ExpensesClient({
  expenses,
  me,
}: {
  expenses: Expense[];
  me: Profile;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const pageItems = expenses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-2xl border border-line bg-card px-[18px] pb-3.5 pt-[18px]">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-serif text-lg font-semibold">Recent expenses</div>
        <button
          onClick={() => setOpen(true)}
          className="grad-gold h-[34px] cursor-pointer rounded-[18px] border-none px-3.5 text-xs font-medium text-white"
        >
          + Add expense
        </button>
      </div>
      {expenses.length === 0 && (
        <div className="py-8 text-center text-[12.5px] text-faint">
          No expenses yet
        </div>
      )}
      {pageItems.map((x) => (
        <div
          key={x.id}
          className="flex items-center gap-3 border-t border-line-4 py-[11px] first:border-t-0"
        >
          <div className="flex-1">
            <div className="text-[13px] font-medium">{x.description}</div>
            <div className="text-[10.5px] text-muted">
              {fmtDate(x.expense_date)}
            </div>
          </div>
          <span className="rounded-[20px] bg-tan px-2 py-[3px] text-[10px] capitalize text-gold-dark">
            {x.category}
          </span>
          <div className="w-[74px] text-right font-serif text-sm font-semibold">
            {fmtMoney(Number(x.amount))}
          </div>
        </div>
      ))}
      <Pagination page={page} total={expenses.length} onChange={setPage} />
      {open && <AddExpenseModal me={me} onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddExpenseModal({
  me,
  onClose,
}: {
  me: Profile;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    if (!note.trim() || !amt) {
      toast("Add description & amount");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("expenses").insert({
      description: note.trim(),
      category,
      amount: amt,
      expense_date: date,
      created_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast("Could not save: " + error.message);
      return;
    }
    toast("Expense added");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title="Add expense"
      onClose={onClose}
      width={420}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? "Saving…" : "Save expense"}
          </PrimaryBtn>
        </>
      }
    >
      <Field label="Description">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Gel polish restock"
          className={inputCls}
        />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Amount">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0.00"
              className={inputCls}
            />
          </Field>
        </div>
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
      </div>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`h-9 cursor-pointer rounded-[20px] px-3.5 text-[12.5px] ${
                category === c.key
                  ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                  : "border border-input bg-white text-[#8a8178]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}
