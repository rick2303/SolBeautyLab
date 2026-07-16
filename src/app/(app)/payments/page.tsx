import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { PaymentsClient } from "./PaymentsClient";
import { fmtMoney, METHOD_LABEL } from "@/lib/format";
import { dayRangeTz, monthRangeTz } from "@/lib/tz";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { PaymentMethod } from "@/lib/types";

export default async function PaymentsPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "payments")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);
  const now = new Date();
  const today = dayRangeTz(now);
  const month = monthRangeTz(now);

  const [{ data: payments }, { data: clients }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, clients(full_name), appointments(services(name))")
      .order("paid_at", { ascending: false })
      .limit(500),
    supabase.from("clients").select("id, full_name").order("full_name"),
  ]);

  const all = payments ?? [];
  const todayPays = all.filter(
    (p) => p.paid_at >= today.from && p.paid_at < today.to
  );
  const monthPays = all.filter(
    (p) => p.paid_at >= month.from && p.paid_at < month.to
  );
  const todaySum = todayPays.reduce((s, p) => s + Number(p.amount), 0);
  const monthSum = monthPays.reduce((s, p) => s + Number(p.amount), 0);

  const byMethod = new Map<PaymentMethod, number>();
  for (const p of monthPays)
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  const top = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0];
  const avg =
    monthPays.length > 0 ? monthSum / monthPays.length : 0;

  return (
    <div>
      <PageHeader
        title={t("Payments")}
        sub={
          me.role === "owner"
            ? t("Recorded income and payment methods")
            : t("Payments for your services")
        }
      />
      <div className="mb-[18px] grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard
          label={t("Today's income")}
          value={fmtMoney(todaySum)}
          hint={`${todayPays.length} ${t("payments")}`}
        />
        <StatCard
          label={t("Month income")}
          value={fmtMoney(monthSum)}
          hint={t("income")}
        />
        <StatCard
          label={t("Top method")}
          value={top ? t(METHOD_LABEL[top[0]]) : "—"}
          hint={top ? fmtMoney(top[1]) : ""}
        />
        <StatCard
          label={t("Avg ticket")}
          value={fmtMoney(avg)}
          hint={t("per visit")}
          gold
        />
      </div>
      <PaymentsClient payments={all} clients={clients ?? []} me={me} />
    </div>
  );
}
