import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { SettingsClient } from "./SettingsClient";
import type { SalonSettings } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "settings")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);

  const { data } = await supabase.from("salon_settings").select("*").limit(1);
  const settings = (data?.[0] ?? {}) as Partial<SalonSettings>;

  return (
    <div>
      <PageHeader
        title={t("Settings")}
        sub={t("Business info, contact and online booking")}
      />
      <SettingsClient settings={settings} />
    </div>
  );
}
