import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader, Card } from "@/components/PageHeader";
import { avatarFor, fmtMoney, initialsOf } from "@/lib/format";
import { monthKeyTz, monthRangeTz, todayKeyTz } from "@/lib/tz";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { ExportPdf } from "./ExportPdf";
import type { Profile } from "@/lib/types";

export default async function ReportsPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  if (!canAccess(session.profile, "reports")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);
  const [cy, cm] = todayKeyTz().split("-").map(Number);
  const sixMonthsAgo = new Date(
    monthRangeTz(new Date(Date.UTC(cy, cm - 1 - 5, 15))).from
  );

  const [
    { data: pays },
    { data: exps },
    { data: appts },
    { data: team },
    { data: clientVisits },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at")
      .gte("paid_at", sixMonthsAgo.toISOString()),
    supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", sixMonthsAgo.toISOString().slice(0, 10)),
    supabase
      .from("appointments")
      .select("price, status, staff_id, services(name)")
      .gte("starts_at", sixMonthsAgo.toISOString()),
    supabase.from("profiles").select("*").eq("is_active", true),
    supabase.from("client_stats").select("visits"),
  ]);

  // Barras rev vs exp por mes (mes según el reloj del salón)
  const months: { key: string; label: string; rev: number; exp: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(cy, cm - 1 - i, 1));
    months.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(lang === "es" ? "es" : "en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      rev: 0,
      exp: 0,
    });
  }
  const mIdx = new Map(months.map((m, i) => [m.key, i]));
  for (const p of pays ?? []) {
    const k = monthKeyTz(p.paid_at);
    const i = mIdx.get(k);
    if (i !== undefined) months[i].rev += Number(p.amount);
  }
  for (const x of exps ?? []) {
    const k = x.expense_date.slice(0, 7);
    const i = mIdx.get(k);
    if (i !== undefined) months[i].exp += Number(x.amount);
  }
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.rev, m.exp)));

  // Servicios más pedidos (completadas, 6 meses)
  const completed = (appts ?? []).filter((a) => a.status === "completed");
  const svcCounts = new Map<string, number>();
  for (const a of completed) {
    const name =
      (a.services as unknown as { name: string } | null)?.name ?? "Other";
    svcCounts.set(name, (svcCounts.get(name) ?? 0) + 1);
  }
  const topServices = [...svcCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSvc = topServices[0]?.[1] ?? 1;

  // Returning vs new: returning = 2+ visitas completadas
  const totalClients = clientVisits?.length ?? 0;
  const returningCount = (clientVisits ?? []).filter(
    (r) => Number(r.visits) >= 2
  ).length;
  const returningPct =
    totalClients > 0 ? Math.round((returningCount / totalClients) * 100) : 0;

  // Performance por empleado
  const perf = ((team ?? []) as Profile[])
    .map((t) => {
      const revenue = completed
        .filter((a) => a.staff_id === t.id)
        .reduce((s, a) => s + Number(a.price), 0);
      return { t, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const maxPerf = perf[0]?.revenue || 1;

  return (
    <div>
      <PageHeader
        title={t("Reports")}
        sub={t("Revenue, services and client insights")}
      >
        <ExportPdf />
      </PageHeader>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <Card className="p-[18px]">
          <div className="font-serif text-lg font-semibold">
            {t("Revenue vs expenses")}
          </div>
          <div className="mb-3.5 text-[11px] text-muted">
            {t("Last 6 months")}
          </div>
          <div className="flex h-[150px] items-end gap-3.5">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex h-full flex-1 flex-col items-center justify-end gap-[5px]"
              >
                <div className="flex h-full w-full items-end gap-[3px]">
                  <div
                    className="flex-1 rounded-t-[5px]"
                    style={{
                      background: "linear-gradient(180deg,#c9a24b,#8a6526)",
                      height: `${Math.round((m.rev / maxBar) * 100)}%`,
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-[5px] bg-[#e4d5b4]"
                    style={{ height: `${Math.round((m.exp / maxBar) * 100)}%` }}
                  />
                </div>
                <span className="text-[9.5px] text-subtle">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-body">
            <span className="flex items-center gap-1.5">
              <span className="grad-gold h-2.5 w-2.5 rounded-[3px]" />{" "}
              {t("Revenue")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#e4d5b4]" />{" "}
              {t("Expenses")}
            </span>
          </div>
        </Card>

        <Card className="p-[18px]">
          <div className="mb-3.5 font-serif text-lg font-semibold">
            {t("Most requested services")}
          </div>
          <div className="flex flex-col gap-3">
            {topServices.length === 0 && (
              <div className="text-[12px] text-faint">
                {t("No completed appointments yet")}
              </div>
            )}
            {topServices.map(([name, count]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{name}</span>
                  <span className="text-muted">{count}</span>
                </div>
                <div className="h-[7px] rounded bg-line">
                  <div
                    className="grad-bar h-[7px] rounded"
                    style={{ width: `${Math.round((count / maxSvc) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.6fr]">
        <Card className="p-[18px]">
          <div className="mb-3.5 font-serif text-lg font-semibold">
            {t("Returning vs new")}
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex h-[110px] w-[110px] items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#8a6526 0 ${returningPct}%, #e4d5b4 ${returningPct}% 100%)`,
              }}
            >
              <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-card font-serif text-xl font-semibold">
                {returningPct}%
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs text-body">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-gold-dark" />
                {t("Returning")} · {returningPct}%
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#e4d5b4]" />
                {t("New")} · {100 - returningPct}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-[18px]">
          <div className="mb-3.5 font-serif text-lg font-semibold">
            {t("Employee performance")}
          </div>
          {perf.map(({ t, revenue }) => (
            <div
              key={t.id}
              className="flex items-center gap-3 border-t border-line-4 py-[9px] first:border-t-0"
            >
              <div
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12.5px] text-white"
                style={{ background: avatarFor(t.id) }}
              >
                {initialsOf(t.full_name)}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-medium">{t.full_name}</div>
                <div className="mt-[5px] h-[5px] rounded-[3px] bg-line">
                  <div
                    className="grad-bar h-[5px] rounded-[3px]"
                    style={{
                      width: `${Math.round((revenue / maxPerf) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="w-[70px] text-right text-[12.5px] text-body">
                {fmtMoney(revenue)}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
