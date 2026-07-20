import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { ClientsClient } from "./ClientsClient";
import type { Client, ClientStats } from "@/lib/types";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "clients")) redirect("/dashboard");
  const supabase = await createClient();

  const [{ data: clients }, { data: stats }, { data: serviceOpts }, { data: staffOpts }] =
    await Promise.all([
      supabase.from("clients").select("*").order("full_name"),
      supabase.from("client_stats").select("*"),
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
    ]);

  return (
    <div>
      <PageHeader
        title={tr(await getLang(), "Clients")}
        sub={tr(await getLang(), "Your client book, history and preferences")}
      />
      <ClientsClient
        me={me}
        clients={(clients ?? []) as Client[]}
        stats={(stats ?? []) as ClientStats[]}
        services={serviceOpts ?? []}
        staff={staffOpts ?? []}
      />
    </div>
  );
}
