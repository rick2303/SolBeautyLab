import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { ScheduleClient } from "./ScheduleClient";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { Profile, WorkHours } from "@/lib/types";

export const metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "schedule")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);

  const [{ data: settings }, { data: team }] = await Promise.all([
    supabase.from("salon_settings").select("opening_hours").limit(1),
    me.role === "owner"
      ? supabase
          .from("profiles")
          .select("id, full_name, role, specialties, work_hours")
          .eq("is_active", true)
          .order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  const salonHours = (settings?.[0]?.opening_hours as WorkHours) ?? {};

  return (
    <div>
      <PageHeader
        title={t("Schedule")}
        sub={
          me.role === "owner"
            ? t("Team schedules")
            : t("Your working hours — clients can only book inside them")
        }
      />
      <ScheduleClient
        me={me}
        team={(team ?? null) as Pick<
          Profile,
          "id" | "full_name" | "role" | "specialties" | "work_hours"
        >[] | null}
        salonHours={salonHours}
      />
    </div>
  );
}
