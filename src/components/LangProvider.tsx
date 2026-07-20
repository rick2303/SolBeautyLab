"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tr, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { saveLangPref } from "@/lib/lang-actions";

const LangCtx = createContext<Lang>("en");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

/** Para componentes dentro del layout (app) */
export function useLang() {
  const lang = useContext(LangCtx);
  return { lang, t: (s: string) => tr(lang, s) };
}

function setLangCookie(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function readLangCookie(): Lang {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes(`${LANG_COOKIE}=es`) ? "es" : "en";
}

/** Para páginas fuera del provider (login, /book): estado local + cookie */
export function useLocalLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(readLangCookie());
  }, []);
  return {
    lang,
    t: (s: string) => tr(lang, s),
    setLang: (l: Lang) => {
      setLangCookie(l);
      setLang(l);
    },
  };
}

/** Selector EN | ES. persist: además de la cookie, guarda la preferencia
 * en el profile del usuario logueado (sobrevive a otros dispositivos). */
export function LangToggle({
  lang,
  onChange,
  refresh = false,
  persist = false,
}: {
  lang: Lang;
  onChange?: (l: Lang) => void;
  refresh?: boolean;
  persist?: boolean;
}) {
  const router = useRouter();

  function pick(l: Lang) {
    setLangCookie(l);
    if (persist) saveLangPref(l); // fire-and-forget
    onChange?.(l);
    if (refresh) router.refresh();
  }

  return (
    <div className="flex gap-0.5 rounded-[20px] bg-tan p-0.5">
      {(["en", "es"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => pick(l)}
          className={`h-7 cursor-pointer rounded-[16px] px-2.5 text-[10.5px] font-semibold uppercase tracking-wide ${
            lang === l
              ? "bg-card text-gold-dark shadow-sm"
              : "bg-transparent text-faint"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
