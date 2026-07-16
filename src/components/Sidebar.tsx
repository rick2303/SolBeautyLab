"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { navFor, ROLE_LABEL } from "@/lib/roles";
import { initialsOf } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { SolLogo } from "@/components/SolLogo";
import { LangToggle, useLang } from "@/components/LangProvider";

function useLogout() {
  const router = useRouter();
  return async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
}

function NavLinks({
  profile,
  onNavigate,
}: {
  profile: Profile;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLang();
  const items = navFor(profile);
  return (
    <nav className="mt-4 flex flex-col gap-px overflow-y-auto">
      {items.map((n) => {
        const active = pathname.startsWith(n.href);
        return (
          <Link
            key={n.key}
            href={n.href}
            onClick={onNavigate}
            className={`flex cursor-pointer items-center gap-[11px] rounded-[10px] px-[13px] py-2 text-[13px] transition-colors ${
              active
                ? "grad-gold-soft font-medium text-gold-deep"
                : "text-body hover:bg-cream"
            }`}
          >
            <span className="w-[18px] text-center text-sm">{n.icon}</span>
            {t(n.label)}
            {n.pro && (
              <span className="ml-auto rounded-[20px] bg-[#f0e2c0] px-1.5 py-0.5 text-[8px] tracking-[0.1em] text-gold-dark">
                PRO
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ profile }: { profile: Profile }) {
  const logout = useLogout();
  const { lang, t } = useLang();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center">
        <LangToggle lang={lang} refresh />
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-cream-deep p-[9px]">
        <div className="grad-gold flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-medium text-white">
          {initialsOf(profile.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium">
            {profile.full_name}
          </div>
          <div className="text-[10px] text-muted">
            {t(ROLE_LABEL[profile.role])}
          </div>
        </div>
        <button
          onClick={logout}
          title={t("Sign out")}
          className="cursor-pointer border-none bg-transparent text-[15px] text-faint"
        >
          ⎋
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ profile }: { profile: Profile }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col border-r border-line-2 bg-card px-[18px] py-5 lg:flex">
      <SolLogo size="sm" />
      <NavLinks profile={profile} />
      <div className="mt-auto pt-3.5">
        <UserCard profile={profile} />
      </div>
    </aside>
  );
}

export function MobileNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line-2 bg-card px-4 lg:hidden">
        <div
          className="text-gold-grad font-serif text-[24px] font-bold"
          style={{ letterSpacing: "0.05em" }}
        >
          SŌL
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line-2 bg-cream text-lg text-gold-dark"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="anim-overlay modal-overlay fixed inset-0 z-40 lg:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-slide-left flex h-full w-[260px] flex-col bg-card px-[18px] py-5"
            style={{ boxShadow: "20px 0 60px -20px rgba(60,40,10,.4)" }}
          >
            <div className="flex items-start justify-between">
              <SolLogo size="sm" />
              <button
                onClick={() => setOpen(false)}
                className="h-[30px] w-[30px] cursor-pointer rounded-full bg-tan text-sm text-[#8a8178]"
              >
                ✕
              </button>
            </div>
            <NavLinks profile={profile} onNavigate={() => setOpen(false)} />
            <div className="mt-auto pt-3.5">
              <UserCard profile={profile} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
