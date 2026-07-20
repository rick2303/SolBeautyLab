import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard } from "@/components/PageHeader";
import { ApptList } from "@/components/ApptRow";
import { NewApptButton } from "@/components/NewApptButton";
import { fmtMoney } from "@/lib/format";
import { dayRangeTz, monthRangeTz, wallHour, SALON_TZ } from "@/lib/tz";
import { canAccess } from "@/lib/roles";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { AppointmentFull } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);

  const now = new Date();
  const today = dayRangeTz(now);
  const month = monthRangeTz(now);
  const isStaff = me.role === "staff";

  // El dashboard respeta los módulos concedidos: si a alguien le quitan
  // Pagos o Clientas, no debe seguir viendo esas tarjetas (antes salían en $0).
  const seePayments = canAccess(me, "payments");
  const seeExpenses = canAccess(me, "expenses");
  const seeClients = canAccess(me, "clients");
  const seeCalendar = canAccess(me, "calendar");

  // Citas de hoy (staff: solo las suyas — RLS lo garantiza igualmente)
  let apptQuery = supabase
    .from("appointments")
    .select("*, clients(full_name), services(name), profiles!staff_id(full_name)")
    .gte("starts_at", today.from)
    .lt("starts_at", today.to)
    .order("starts_at");
  if (isStaff) apptQuery = apptQuery.eq("staff_id", me.id);
  const { data: todayAppts } = await apptQuery;

  // Próximas citas (siguientes 7 días)
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);
  let upcomingQ = supabase
    .from("appointments")
    .select("*, clients(full_name), services(name), profiles!staff_id(full_name)")
    .gte("starts_at", today.to)
    .lt("starts_at", weekAhead.toISOString())
    .in("status", ["scheduled", "confirmed"])
    .order("starts_at")
    .limit(6);
  if (isStaff) upcomingQ = upcomingQ.eq("staff_id", me.id);
  const { data: upcomingAppts } = await upcomingQ;

  // Servicios top del mes (citas completadas)
  let monthApptQ = supabase
    .from("appointments")
    .select("price, status, services(name)")
    .gte("starts_at", month.from)
    .lt("starts_at", month.to);
  if (isStaff) monthApptQ = monthApptQ.eq("staff_id", me.id);
  const { data: monthAppts } = await monthApptQ;

  const completed = (monthAppts ?? []).filter((a) => a.status === "completed");
  const svcCounts = new Map<string, number>();
  for (const a of completed) {
    const name =
      (a.services as unknown as { name: string } | null)?.name ?? "Other";
    svcCounts.set(name, (svcCounts.get(name) ?? 0) + 1);
  }
  const topServices = [...svcCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = topServices[0]?.[1] ?? 1;

  // Stats según rol
  let statCards: {
    label: string;
    value: string;
    hint?: string;
    gold?: boolean;
    hintColor?: string;
  }[] = [];

  if (isStaff) {
    const myEarnings = completed.reduce((s, a) => s + Number(a.price), 0);
    statCards = [
      {
        label: t("Today's appointments"),
        value: String(todayAppts?.length ?? 0),
      },
      {
        label: t("Completed this month"),
        value: String(completed.length),
        hint: t("services"),
      },
      {
        label: t("Month production"),
        value: fmtMoney(myEarnings),
        hint: t("completed services"),
        gold: true,
      },
    ];
  } else if (seePayments) {
    const { data: todayPays } = await supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", today.from)
      .lt("paid_at", today.to);
    const { data: monthPays } = await supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", month.from)
      .lt("paid_at", month.to);
    const todayRev = (todayPays ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const monthRev = (monthPays ?? []).reduce((s, p) => s + Number(p.amount), 0);

    if (me.role === "owner" && seeExpenses) {
      const { data: monthExps } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", month.from.slice(0, 10))
        .lt("expense_date", month.to.slice(0, 10));
      const monthExp = (monthExps ?? []).reduce(
        (s, x) => s + Number(x.amount),
        0
      );
      const profit = monthRev - monthExp;
      statCards = [
        {
          label: t("Today's revenue"),
          value: fmtMoney(todayRev),
          hint: `${todayPays?.length ?? 0} ${t("payments")}`,
          hintColor: "#5a9f6a",
        },
        {
          label: t("Month revenue"),
          value: fmtMoney(monthRev),
          hint: t("income"),
        },
        {
          label: t("Month expenses"),
          value: fmtMoney(monthExp),
        },
        {
          label: t("Est. profit"),
          value: fmtMoney(profit),
          hint:
            monthRev > 0
              ? Math.round((profit / monthRev) * 100) + t("% margin")
              : "—",
          gold: true,
        },
      ];
    } else {
      // Receptionist (o owner sin módulo de gastos): RLS solo muestra los
      // pagos de sus propios servicios
      statCards = [
        {
          label: t("My revenue today"),
          value: fmtMoney(todayRev),
          hint: `${todayPays?.length ?? 0} ${t("payments")}`,
        },
        { label: t("My month revenue"), value: fmtMoney(monthRev) },
        {
          label: t("Today's appointments"),
          value: String(todayAppts?.length ?? 0),
          gold: true,
        },
      ];
    }
  } else {
    // Sin módulo de pagos: métricas de agenda, no de dinero
    statCards = [
      {
        label: t("Today's appointments"),
        value: String(todayAppts?.length ?? 0),
      },
      {
        label: t("Upcoming · next 7 days"),
        value: String(upcomingAppts?.length ?? 0),
      },
      {
        label: t("Completed this month"),
        value: String(completed.length),
        hint: t("services"),
        gold: true,
      },
    ];
  }

  // Recurrentes vs nuevas del mes: de las clientas atendidas, cuáles ya habían
  // venido antes. (Antes se medía "2+ visitas" sobre toda la cartera histórica:
  // un número fijo que no decía nada del mes en curso.)
  let histQ = supabase
    .from("appointments")
    .select("client_id, starts_at")
    .eq("status", "completed")
    .lt("starts_at", month.to);
  if (isStaff) histQ = histQ.eq("staff_id", me.id);
  const { data: doneHistory } = seeClients ? await histQ : { data: null };

  const before = new Set<string>();
  const inMonth = new Set<string>();
  for (const a of doneHistory ?? []) {
    if (!a.client_id) continue;
    if (a.starts_at < month.from) before.add(a.client_id);
    else inMonth.add(a.client_id);
  }
  const servedCount = inMonth.size;
  const returningCount = [...inMonth].filter((c) => before.has(c)).length;
  const newCount = servedCount - returningCount;
  const returningPct =
    servedCount > 0 ? Math.round((returningCount / servedCount) * 100) : 0;

  // Datos para el modal de nueva cita (solo si puede usar la agenda)
  const [{ data: clientOpts }, { data: serviceOpts }, { data: staffOpts }] =
    seeCalendar
      ? await Promise.all([
          supabase.from("clients").select("id, full_name").order("full_name"),
          supabase
            .from("services")
            .select("id, name, price, duration_min")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("is_active", true)
            .order("full_name"),
        ])
      : [{ data: null }, { data: null }, { data: null }];

  const h = wallHour();
  const greeting = t(
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
  );
  const dateLabel = now.toLocaleDateString(lang === "es" ? "es" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: SALON_TZ,
  });

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${me.full_name.split(" ")[0]}`}
        sub={`${dateLabel} · ${todayAppts?.length ?? 0} ${t("appointments today")}`}
      >
        {seeCalendar && (
          <NewApptButton
            clients={clientOpts ?? []}
            services={serviceOpts ?? []}
            staff={staffOpts ?? []}
            me={me}
          />
        )}
      </PageHeader>

      <div
        className={`mb-5 grid gap-3.5 ${
          statCards.length === 4
            ? "grid-cols-2 xl:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-3"
        }`}
      >
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-[18px]">
          <Card className="px-[18px] pb-2.5 pt-[18px]">
            <div className="mb-1.5 flex items-baseline justify-between">
              <div className="font-serif text-[19px] font-semibold">
                {t("Today's appointments")}
              </div>
              {seeCalendar && (
                <Link
                  href="/calendar"
                  className="text-[11.5px] text-[#b0863c] hover:text-gold-dark"
                >
                  {t("View calendar →")}
                </Link>
              )}
            </div>
            <ApptList
              appts={(todayAppts ?? []) as unknown as AppointmentFull[]}
              empty={t("No appointments today")}
              canCharge={seePayments}
            />
          </Card>
          <Card className="px-[18px] pb-2.5 pt-[18px]">
            <div className="mb-1.5 font-serif text-[19px] font-semibold">
              {t("Upcoming · next 7 days")}
            </div>
            <ApptList
              appts={(upcomingAppts ?? []) as unknown as AppointmentFull[]}
              empty={t("Nothing scheduled for the next 7 days")}
              showDate
              canCharge={seePayments}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-[18px]">
          <Card className="p-[18px]">
            <div className="mb-3 font-serif text-[19px] font-semibold">
              {t("Top services this month")}
            </div>
            <div className="flex flex-col gap-[11px]">
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
                  <div className="h-1.5 rounded bg-line">
                    <div
                      className="grad-bar h-1.5 rounded"
                      style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {seeClients && (
            <Card className="flex-1 p-[18px]">
              <div className="font-serif text-[19px] font-semibold">
                {isStaff ? t("My clients this month") : t("Clients this month")}
              </div>
              {servedCount === 0 ? (
                <div className="py-6 text-center text-[12px] text-faint">
                  {t("No clients served yet this month")}
                </div>
              ) : (
                <>
                  <div className="mt-3 flex gap-[22px]">
                    <div>
                      <div className="font-serif text-[26px] font-semibold">
                        {returningPct}%
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {t("Returning")}
                      </div>
                    </div>
                    <div>
                      <div className="font-serif text-[26px] font-semibold">
                        {100 - returningPct}%
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {t("New")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3.5 flex h-2 overflow-hidden rounded-[5px] bg-line">
                    <div
                      className="grad-bar"
                      style={{ width: `${returningPct}%` }}
                    />
                    <div className="flex-1 bg-[#e4d5b4]" />
                  </div>
                  <div className="mt-3 text-[11px] text-muted">
                    {servedCount} {t("clients served")} · {returningCount}{" "}
                    {t("returning")} · {newCount} {t("new")}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
