import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { getSessionProfile } from "@/lib/supabase/server";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const c = store.get(LANG_COOKIE)?.value;
  if (c === "es" || c === "en") return c;
  // Sin cookie (dispositivo/navegador nuevo): preferencia guardada del usuario
  const session = await getSessionProfile();
  return session?.profile?.lang === "es" ? "es" : "en";
}
