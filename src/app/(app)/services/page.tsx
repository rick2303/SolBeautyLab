import { redirect } from "next/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";
import { ServicesClient } from "./ServicesClient";
import type { Service, ServiceCategory } from "@/lib/types";

export default async function ServicesPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const me = session.profile;
  if (!canAccess(me, "services")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title={
          (await getLang()) === "es" ? "Servicios y precios" : "Services & pricing"
        }
        sub={
          (await getLang()) === "es"
            ? "Actualiza servicios, precios y duraciones cuando quieras"
            : "Update services, prices and durations anytime"
        }
      />
      <ServicesClient
        me={me}
        categories={(categories ?? []) as ServiceCategory[]}
        services={(services ?? []) as Service[]}
      />
    </div>
  );
}
