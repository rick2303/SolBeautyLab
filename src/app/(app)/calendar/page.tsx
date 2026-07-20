import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { NewApptButton } from "@/components/NewApptButton";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { CalendarClient } from "./CalendarClient";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "calendar")) redirect("/dashboard");
  const supabase = await createClient();

  const { data: clientOpts } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name");
  const { data: serviceOpts } = await supabase
    .from("services")
    .select("id, name, price, duration_min")
    .eq("is_active", true)
    .order("name");
  const { data: staffOpts } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");

  return (
    <div>
      <PageHeader
        title={tr(await getLang(), "Calendar")}
        sub={tr(
          await getLang(),
          me.role === "staff"
            ? "Your book — day, week and month"
            : "Manage your books across day, week and month"
        )}
      >
        <NewApptButton
          clients={clientOpts ?? []}
          services={serviceOpts ?? []}
          staff={staffOpts ?? []}
          me={me}
        />
      </PageHeader>
      <CalendarClient me={me} />
    </div>
  );
}
