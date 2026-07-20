import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { RemindersClient } from "./RemindersClient";
import type { MessageTemplate, ReminderSetting } from "@/lib/types";

export const metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  if (!canAccess(session.profile, "reminders")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: settings }, { data: templates }, { data: recent }, { data: salon }] =
    await Promise.all([
      supabase.from("reminder_settings").select("*"),
      supabase.from("message_templates").select("*").order("type"),
      supabase
        .from("messages")
        .select("id, type, channel, to_phone, status, scheduled_at, sent_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase.from("salon_settings").select("staff_booking_template").limit(1),
    ]);

  return (
    <div>
      <PageHeader
        title={tr(await getLang(), "Automated reminders")}
        sub={tr(await getLang(), "SMS reminders · keep clients coming back")}
      />
      <RemindersClient
        settings={(settings ?? []) as ReminderSetting[]}
        templates={(templates ?? []) as MessageTemplate[]}
        recent={recent ?? []}
        staffTemplate={salon?.[0]?.staff_booking_template ?? ""}
      />
    </div>
  );
}
