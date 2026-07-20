import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader, StatCard, Card } from "@/components/PageHeader";
import { ExpensesClient } from "./ExpensesClient";
import { fmtMoney } from "@/lib/format";
import { monthRangeTz } from "@/lib/tz";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { Expense } from "@/lib/types";

const CAT_LABEL: Record<string, string> = {
  supplies: "Supplies",
  rent: "Rent",
  marketing: "Marketing",
  utilities: "Utilities",
  equipment: "Equipment",
  other: "Other",
};

export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "expenses")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);
  const now = new Date();
  const month = monthRangeTz(now);

  // Los ingresos solo se muestran a quien puede verlos completos: para el
  // resto la base de datos filtra los pagos y la "ganancia" saldría falsa
  // (ingresos parciales menos gastos totales = pérdida inventada).
  const seeRevenue = me.role === "owner" && canAccess(me, "payments");

  const [{ data: expenses }, { data: monthPays }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(500),
    seeRevenue
      ? supabase
          .from("payments")
          .select("amount")
          .gte("paid_at", month.from)
          .lt("paid_at", month.to)
      : Promise.resolve({ data: null }),
  ]);

  const all = (expenses ?? []) as Expense[];
  const monthExps = all.filter(
    (x) =>
      x.expense_date >= month.from.slice(0, 10) &&
      x.expense_date < month.to.slice(0, 10)
  );
  const monthExp = monthExps.reduce((s, x) => s + Number(x.amount), 0);
  const monthRev = (monthPays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const profit = monthRev - monthExp;

  const catTotals = new Map<string, number>();
  for (const x of monthExps)
    catTotals.set(x.category, (catTotals.get(x.category) ?? 0) + Number(x.amount));
  const cats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] ?? 1;

  return (
    <div>
      <PageHeader
        title={t("Expenses")}
        sub={t("Track spending and estimated profit")}
      />
      <div
        className={`mb-[18px] grid grid-cols-1 gap-3.5 ${
          seeRevenue ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        <StatCard
          label={t("Month expenses")}
          value={fmtMoney(monthExp)}
          hint={`${monthExps.length} ${t("entries")}`}
        />
        {seeRevenue ? (
          <>
            <StatCard
              label={t("Month revenue")}
              value={fmtMoney(monthRev)}
              hint={t("income")}
              hintColor="#5a9f6a"
            />
            <StatCard
              label={t("Est. profit")}
              value={fmtMoney(profit)}
              hint={
                monthRev > 0
                  ? Math.round((profit / monthRev) * 100) + t("% margin")
                  : "—"
              }
              gold
            />
          </>
        ) : (
          <StatCard
            label={t("Entries this month")}
            value={String(monthExps.length)}
            hint={t("expenses")}
            gold
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-[18px]">
          <div className="mb-3.5 font-serif text-lg font-semibold">
            {t("By category")}
          </div>
          <div className="flex flex-col gap-3">
            {cats.length === 0 && (
              <div className="text-[12px] text-faint">
                {t("No expenses this month")}
              </div>
            )}
            {cats.map(([cat, amount]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{t(CAT_LABEL[cat] ?? cat)}</span>
                  <span className="text-muted">{fmtMoney(amount)}</span>
                </div>
                <div className="h-1.5 rounded bg-line">
                  <div
                    className="grad-bar h-1.5 rounded"
                    style={{ width: `${Math.round((amount / maxCat) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <ExpensesClient expenses={all} me={me} />
      </div>
    </div>
  );
}
