"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/server";

/** Se llama después de que el usuario ya cambió su contraseña vía auth.updateUser */
export async function clearMustChangePassword(): Promise<{
  ok?: true;
  error?: string;
}> {
  const session = await getSessionProfile();
  if (!session?.profile) return { error: "Not signed in" };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", session.profile.id);
  if (error) return { error: error.message };

  return { ok: true };
}
