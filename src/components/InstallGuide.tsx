"use client";

import { useEffect, useState } from "react";
import { Modal, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useLang } from "@/components/LangProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const { t } = useLang();

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installNow() {
    if (!installEvt) return;
    await installEvt.prompt();
    const { outcome } = await installEvt.userChoice;
    if (outcome === "accepted") {
      setInstallEvt(null);
      setOpen(false);
    }
  }

  // Ya corre instalada: el botón sobra
  if (installed && !open) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 w-full cursor-pointer rounded-[10px] border border-line-2 bg-cream text-[11.5px] font-medium text-gold-dark hover:bg-cream-deep"
      >
        ↓ {t("How to install")}
      </button>

      {open && (
        <Modal title={t("Install the app")} onClose={() => setOpen(false)}>
          {installed ? (
            <div className="rounded-xl bg-[#eaf5ec] px-3.5 py-3 text-[13px] text-[#4a7d57]">
              {t("App already installed ✓")}
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-warm">
                {t(
                  "Add Sol Beauty Lab to your home screen to open it like a regular app."
                )}
              </p>

              {installEvt && (
                <PrimaryBtn onClick={installNow}>
                  {t("Install now")}
                </PrimaryBtn>
              )}

              <Step
                highlight={isIOS}
                title={t("On iPhone / iPad (Safari)")}
                steps={[
                  `1 · ${t("Tap the Share button")} (□↑)`,
                  `2 · ${t("Choose “Add to Home Screen”")}`,
                ]}
              />
              <Step
                title={t("On Android (Chrome)")}
                steps={[
                  `1 · ${t("Open the ⋮ menu")}`,
                  `2 · ${t("Tap “Install app” or “Add to Home screen”")}`,
                ]}
              />
              <Step
                title={t("On computer (Chrome / Edge)")}
                steps={[
                  `1 · ${t(
                    "Click the install icon at the right end of the address bar"
                  )}`,
                ]}
              />
            </>
          )}
          <GhostBtn onClick={() => setOpen(false)}>{t("Close")}</GhostBtn>
        </Modal>
      )}
    </>
  );
}

function Step({
  title,
  steps,
  highlight = false,
}: {
  title: string;
  steps: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        highlight ? "border-gold-light bg-gold-pale" : "border-line-2 bg-card"
      }`}
    >
      <div className="text-[12px] font-semibold">{title}</div>
      {steps.map((s) => (
        <div key={s} className="mt-1 text-[12px] leading-relaxed text-muted">
          {s}
        </div>
      ))}
    </div>
  );
}
