import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { TeamClient } from "./TeamClient";
import { dayRangeTz, monthRangeTz } from "@/lib/tz";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

export default async function TeamPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "team")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const now = new Date();
  const today = dayRangeTz(now);
  const month = monthRangeTz(now);

  const [{ data: team }, { data: monthAppts }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase
      .from("appointments")
      .select("staff_id, price, status, starts_at")
      .gte("starts_at", month.from)
      .lt("starts_at", month.to),
  ]);

  const appts = monthAppts ?? [];
  const rows = ((team ?? []) as Profile[]).map((t) => {
    const mine = appts.filter((a) => a.staff_id === t.id);
    const completed = mine.filter((a) => a.status === "completed");
    const todayCount = mine.filter(
      (a) => a.starts_at >= today.from && a.starts_at < today.to
    ).length;
    const revenue = completed.reduce((s, a) => s + Number(a.price), 0);
    return {
      member: t,
      todayCount,
      servicesCount: completed.length,
      revenue,
    };
  });

  return (
    <div>
      <PageHeader
        title={tr(lang, "Team")}
        sub={tr(lang, "Staff, roles, permissions and performance")}
      />
      <TeamClient me={me} rows={rows} />
    </div>
  );
}
