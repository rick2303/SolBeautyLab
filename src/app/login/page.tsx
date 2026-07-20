"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui/Modal";
import { LangToggle, useLocalLang } from "@/components/LangProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { lang, t, setLang } = useLocalLang();

  async function signIn() {
    setLoading(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(t("Invalid email or password"));
      setLoading(false);
      return;
    }
    // Supabase Auth no sabe de cuentas desactivadas: se revisa aquí y se
    // cierra la sesión antes de navegar, para no rebotar contra el middleware.
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .single();
    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      setError(t("This account is deactivated — ask the owner to reactivate it"));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function forgot() {
    if (!email.trim()) {
      setError(t("Enter your email above and we'll send you a reset link"));
      return;
    }
    setError("");
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setNotice(t("Reset link sent — check your email"));
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div
        className="anim-scale relative w-[400px] max-w-full rounded-[22px] border border-line-2 bg-card px-[34px] pb-[30px] pt-[38px]"
        style={{ boxShadow: "0 30px 70px -30px rgba(90,60,10,.4)" }}
      >
        <div className="absolute right-4 top-4">
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo-transparent.png"
          alt="Sol Beauty Lab"
          className="mx-auto w-[168px]"
        />
        <div
          className="mt-1 text-center text-[19px] text-[#b0863c]"
          style={{ fontFamily: "var(--font-script)" }}
        >
          Luz que realza tu esencia
        </div>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
        >
          <label className="text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Email")}
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@solbeautylab.com"
            className={`${inputCls} mt-1.5`}
          />
          <label className="mt-4 block text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Password")}
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${inputCls} mt-1.5 tracking-[0.3em]`}
          />
          {error && (
            <div className="anim-shake mt-3 rounded-xl bg-[#f6e9e9] px-3.5 py-2.5 text-[12.5px] text-[#a05a5a]">
              {error}
            </div>
          )}
          {notice && (
            <div className="anim-fade mt-3 rounded-xl bg-[#eaf5ec] px-3.5 py-2.5 text-[12.5px] text-[#4a7d57]">
              {notice}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="grad-gold mt-[22px] h-12 w-full cursor-pointer rounded-[14px] border-none text-[15px] font-medium text-white disabled:opacity-60"
            style={{ boxShadow: "0 12px 24px -12px rgba(138,101,38,.9)" }}
          >
            {loading && <span className="spinner mr-2" />}
            {loading ? t("Signing in…") : t("Enter studio")}
          </button>
          <button
            type="button"
            onClick={forgot}
            className="mt-3.5 w-full cursor-pointer border-none bg-transparent text-center text-[12px] text-[#b0863c] hover:text-gold-dark"
          >
            {t("Forgot password?")}
          </button>
          <div className="mt-2 border-t border-line-4 pt-3 text-center text-[12px] text-muted">
            {t("Looking to book a visit?")}{" "}
            <a
              href="/book"
              className="font-medium text-[#b0863c] hover:text-gold-dark"
            >
              {t("Book an appointment →")}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
