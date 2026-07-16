"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { STATUS_LABEL, METHOD_LABEL } from "@/lib/format";
import type { AppointmentStatus, PaymentMethod } from "@/lib/types";

type Period = "day" | "week" | "month";

const GOLD: [number, number, number] = [138, 101, 38];
const INK: [number, number, number] = [43, 38, 34];
const MUTED: [number, number, number] = [154, 144, 130];

function rangeFor(period: Period): { from: Date; to: Date; label: string } {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "day") {
    const to = new Date(startToday);
    to.setDate(to.getDate() + 1);
    return {
      from: startToday,
      to,
      label: now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  }
  if (period === "week") {
    const from = new Date(startToday);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); // lunes
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const end = new Date(to);
    end.setDate(end.getDate() - 1);
    return {
      from,
      to,
      label: `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    from,
    to,
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function ExportPdf() {
  const [period, setPeriod] = useState<Period>("day");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function generate() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const { from, to, label } = rangeFor(period);
      const supabase = createClient();

      const [{ data: pays }, { data: exps }, { data: appts }] =
        await Promise.all([
          supabase
            .from("payments")
            .select("amount, method, paid_at, clients(full_name)")
            .gte("paid_at", from.toISOString())
            .lt("paid_at", to.toISOString())
            .order("paid_at"),
          supabase
            .from("expenses")
            .select("description, category, amount, expense_date")
            .gte("expense_date", from.toISOString().slice(0, 10))
            .lt("expense_date", to.toISOString().slice(0, 10))
            .order("expense_date"),
          supabase
            .from("appointments")
            .select(
              "starts_at, price, status, clients(full_name), services(name), profiles!staff_id(full_name)"
            )
            .gte("starts_at", from.toISOString())
            .lt("starts_at", to.toISOString())
            .order("starts_at"),
        ]);

      const payments = pays ?? [];
      const expenses = exps ?? [];
      const appointments = appts ?? [];
      const revenue = payments.reduce((s, p) => s + Number(p.amount), 0);
      const spent = expenses.reduce((s, x) => s + Number(x.amount), 0);
      const completed = appointments.filter((a) => a.status === "completed");

      const doc = new jsPDF();
      const W = doc.internal.pageSize.getWidth();

      // Encabezado
      doc.setFillColor(34, 29, 24);
      doc.rect(0, 0, W, 34, "F");
      doc.setTextColor(228, 201, 126);
      doc.setFont("times", "bold");
      doc.setFontSize(24);
      doc.text("SOL BEAUTY LAB", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(196, 185, 166);
      doc.text(
        `${period === "day" ? "Daily" : period === "week" ? "Weekly" : "Monthly"} report · ${label}`,
        14,
        24
      );
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleString("en-US")}`, 14, 29.5);

      // Resumen
      let y = 44;
      doc.setFontSize(11);
      doc.setTextColor(...GOLD);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Revenue", "Expenses", "Est. profit", "Appointments", "Completed"]],
        body: [
          [
            money(revenue),
            money(spent),
            money(revenue - spent),
            String(appointments.length),
            String(completed.length),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: GOLD, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 11, textColor: INK, halign: "center" },
        styles: { halign: "center" },
      });

      // Pagos
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setTextColor(...GOLD);
      doc.text(`Payments (${payments.length})`, 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Date", "Client", "Method", "Amount"]],
        body: payments.map((p) => [
          new Date(p.paid_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          (p.clients as unknown as { full_name: string } | null)?.full_name ?? "—",
          METHOD_LABEL[p.method as PaymentMethod] ?? p.method,
          money(Number(p.amount)),
        ]),
        foot:
          payments.length > 0
            ? [["", "", "Total", money(revenue)]]
            : undefined,
        theme: "striped",
        headStyles: { fillColor: GOLD, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: INK },
        footStyles: { fillColor: [244, 231, 201], textColor: GOLD, fontStyle: "bold" },
        columnStyles: { 3: { halign: "right" } },
      });

      // Gastos
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setTextColor(...GOLD);
      doc.text(`Expenses (${expenses.length})`, 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Date", "Description", "Category", "Amount"]],
        body: expenses.map((x) => [
          new Date(x.expense_date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          x.description,
          x.category,
          money(Number(x.amount)),
        ]),
        foot:
          expenses.length > 0 ? [["", "", "Total", money(spent)]] : undefined,
        theme: "striped",
        headStyles: { fillColor: GOLD, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: INK },
        footStyles: { fillColor: [244, 231, 201], textColor: GOLD, fontStyle: "bold" },
        columnStyles: { 3: { halign: "right" } },
      });

      // Citas
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setTextColor(...GOLD);
      doc.text(`Appointments (${appointments.length})`, 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["When", "Client", "Service", "Technician", "Status", "Price"]],
        body: appointments.map((a) => [
          new Date(a.starts_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          (a.clients as unknown as { full_name: string } | null)?.full_name ?? "—",
          (a.services as unknown as { name: string } | null)?.name ?? "—",
          (a.profiles as unknown as { full_name: string } | null)?.full_name?.split(" ")[0] ?? "—",
          STATUS_LABEL[a.status as AppointmentStatus] ?? a.status,
          money(Number(a.price)),
        ]),
        theme: "striped",
        headStyles: { fillColor: GOLD, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: INK },
        columnStyles: { 5: { halign: "right" } },
      });

      // Pie de página
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(
          `Sol Beauty Lab · page ${i} of ${pages}`,
          W / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(
        `sol-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast("PDF exported");
    } catch (e) {
      toast("Export failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5 rounded-xl bg-tan p-1">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`cursor-pointer rounded-[9px] border-none px-3 py-[6px] text-xs capitalize ${
              period === p
                ? "bg-card font-medium text-gold-dark shadow-sm"
                : "bg-transparent text-[#8a8178]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        onClick={generate}
        disabled={busy}
        className="grad-gold h-10 cursor-pointer rounded-[20px] border-none px-[18px] text-[13px] font-medium text-white disabled:opacity-60"
        style={{ boxShadow: "0 10px 20px -12px rgba(138,101,38,.9)" }}
      >
        {busy ? "Generating…" : "⭳ Export PDF"}
      </button>
    </div>
  );
}
