import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { TeamClient } from "./TeamClient";
import { dayRangeTz, monthRangeTz } from "@/lib/tz";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { Profile, ServiceCategory, WorkHours } from "@/lib/types";

export const metadata = { title: "Team" };

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

  const [{ data: team }, { data: monthAppts }, { data: settings }, { data: categories }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("appointments")
        .select("staff_id, price, status, starts_at")
        .gte("starts_at", month.from)
        .lt("starts_at", month.to),
      supabase.from("salon_settings").select("opening_hours").limit(1),
      supabase
        .from("service_categories")
        .select("id, name, icon")
        .eq("is_active", true)
        .order("sort_order"),
    ]);
  const salonHours = (settings?.[0]?.opening_hours as WorkHours) ?? {};

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
      <TeamClient
        me={me}
        rows={rows}
        salonHours={salonHours}
        categories={
          (categories ?? []) as Pick<ServiceCategory, "id" | "name" | "icon">[]
        }
      />
    </div>
  );
}
