import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { InspoClient } from "./InspoClient";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import type { AppointmentFull } from "@/lib/types";

export default async function InspoPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "inspo")) redirect("/dashboard");

  const supabase = await createClient();
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);

  // Ventana: últimos 30 días + todas las futuras (sin tope superior)
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  let q = supabase
    .from("appointments")
    .select("*, clients(full_name), services(name), profiles!staff_id(full_name)")
    .gte("starts_at", cutoff)
    .order("starts_at", { ascending: true });
  if (me.role !== "owner") q = q.eq("staff_id", me.id);
  const { data } = await q;

  return (
    <div>
      <PageHeader
        title={t("Inspo")}
        sub={t("Prep your work — inspiration photos per appointment")}
      />
      <InspoClient appts={(data ?? []) as unknown as AppointmentFull[]} />
    </div>
  );
}
