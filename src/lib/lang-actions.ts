"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Lang } from "@/lib/i18n";

/** Guarda el idioma como preferencia del usuario (además de la cookie). */
export async function saveLangPref(lang: Lang): Promise<void> {
  if (lang !== "en" && lang !== "es") return;
  const session = await getSessionProfile();
  if (!session?.profile) return;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  await admin.from("profiles").update({ lang }).eq("id", session.profile.id);
}
