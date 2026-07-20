import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export function isPushConfigured(): boolean {
  return (
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Envía una notificación push a todos los dispositivos de un miembro.
 * Nunca lanza; borra las suscripciones expiradas (404/410).
 */
export async function sendPushToProfile(
  profileId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@solbeautylab.cc",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const db = admin();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  const json = JSON.stringify(payload);
  await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
}
