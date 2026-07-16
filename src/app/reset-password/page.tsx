"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SolLogo } from "@/components/SolLogo";
import { inputCls } from "@/components/ui/Modal";
import { useLocalLang } from "@/components/LangProvider";

export default function ResetPasswordPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { t } = useLocalLang();

  async function save() {
    setError("");
    if (pw.length < 6) {
      setError(t("Minimum 6 characters"));
      return;
    }
    if (pw !== pw2) {
      setError(t("Passwords don't match"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
        className="anim-scale w-[400px] max-w-full rounded-[22px] border border-line-2 bg-card px-[34px] pb-[30px] pt-[38px]"
        style={{ boxShadow: "0 30px 70px -30px rgba(90,60,10,.4)" }}
      >
        <SolLogo size="sm" />
        <div className="mt-5 text-center font-serif text-xl font-semibold">
          {t("Set a new password")}
        </div>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("New password")}
          </label>
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${inputCls} mt-1.5`}
          />
          <label className="mt-4 block text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Confirm password")}
          </label>
          <input
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${inputCls} mt-1.5`}
          />
          {error && (
            <div className="anim-shake mt-3 rounded-xl bg-[#f6e9e9] px-3.5 py-2.5 text-[12.5px] text-[#a05a5a]">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !pw || !pw2}
            className="grad-gold mt-[22px] h-12 w-full cursor-pointer rounded-[14px] border-none text-[15px] font-medium text-white disabled:opacity-60"
            style={{ boxShadow: "0 12px 24px -12px rgba(138,101,38,.9)" }}
          >
            {saving && <span className="spinner mr-2" />}
            {t("Save new password")}
          </button>
        </form>
      </div>
    </div>
  );
}
