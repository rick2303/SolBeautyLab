import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { canAccess } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

export const metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  if (!canAccess(session.profile, "reminders")) redirect("/dashboard");

  const lang = await getLang();

  // Bloqueo temporal: la mensajería automática aún no se habilita.
  // Cuando esté lista se restaura <RemindersClient /> (ver historial de git).
  return (
    <div>
      <PageHeader
        title={tr(lang, "Automated reminders")}
        sub={tr(lang, "SMS reminders · keep clients coming back")}
      />
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-line bg-card px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-pale text-[26px] text-gold-deep">
          ◷
        </div>
        <h2 className="mt-6 text-lg font-semibold text-ink">
          {tr(lang, "This section isn't available yet")}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {tr(
            lang,
            "Automated reminders are coming soon. We'll turn them on here as soon as they're ready."
          )}
        </p>
      </div>
    </div>
  );
}
