"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/server";

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Guarda (o actualiza) la suscripción push del usuario en sesión */
export async function savePushSubscription(
  sub: PushSub
): Promise<{ ok?: true; error?: string }> {
  const session = await getSessionProfile();
  if (!session?.profile) return { error: "Not signed in" };

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { error: "Missing service key" };
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        profile_id: session.profile.id,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      { onConflict: "endpoint" }
    );
  if (error) return { error: error.message };
  return { ok: true };
}
