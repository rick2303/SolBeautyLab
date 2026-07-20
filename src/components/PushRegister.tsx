"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { savePushSubscription } from "@/app/(app)/push-actions";

// VAPID public key (base64url) → ArrayBuffer para applicationServerKey
function urlB64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

const DISMISS_KEY = "push-banner-dismissed";

export function PushRegister() {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    )
      return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Solo ofrecer si aún no decidió y no descartó el banner antes
    if (
      Notification.permission === "default" &&
      localStorage.getItem(DISMISS_KEY) !== "1"
    ) {
      setShow(true);
    } else if (Notification.permission === "granted") {
      // Re-sincroniza la suscripción por si el navegador la rotó
      subscribe(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(silent = false) {
    if (!silent) setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToBuffer(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setShow(false);
    } catch {
      // silencioso: el push es opcional
    } finally {
      if (!silent) setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[420px] items-center gap-3 rounded-[14px] border border-gold-light bg-card p-3 shadow-[0_16px_40px_-12px_rgba(60,40,10,.4)] lg:left-auto lg:right-4">
      <span className="grad-gold-soft flex h-9 w-9 flex-none items-center justify-center rounded-full text-gold-deep">
        ✦
      </span>
      <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-warm">
        {t("Get notified the moment a client books")}
      </div>
      <button
        onClick={() => subscribe()}
        disabled={busy}
        className="grad-gold h-8 flex-none cursor-pointer rounded-[18px] border-none px-3 text-[11.5px] font-medium text-white disabled:opacity-60"
      >
        {busy ? "…" : t("Enable")}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="h-7 w-7 flex-none cursor-pointer rounded-full text-sm text-faint"
      >
        ✕
      </button>
    </div>
  );
}
