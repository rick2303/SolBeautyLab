import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { LangProvider } from "@/components/LangProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { PushRegister } from "@/components/PushRegister";
import { SolLogo } from "@/components/SolLogo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const lang = await getLang();

  if (!session.profile) {
    // Usuario sin fila en profiles (creado antes del trigger)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-[440px] max-w-full rounded-[22px] border border-line-2 bg-card p-8 text-center">
          <SolLogo size="sm" />
          <div className="mt-5 font-serif text-xl font-semibold">
            Account not set up yet
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-body">
            Your login exists but has no profile. Run this in the Supabase SQL
            editor (replace the name), then reload:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-cream-deep p-3 text-left text-[11px] text-warm">
            {`insert into profiles (id, full_name, role)\nvalues ('${session.userId}', 'Your Name', 'owner');`}
          </pre>
        </div>
      </div>
    );
  }

  // is_active y must_change_password los resuelve el middleware — hacerlo
  // también aquí creaba redirects contradictorios (bucle infinito).

  return (
    <LangProvider lang={lang}>
      <ToastProvider>
        <div className="flex min-h-screen bg-cream">
          <Sidebar profile={session.profile} />
          <MobileNav profile={session.profile} />
          <main className="min-w-0 flex-1 overflow-hidden px-4 pb-10 pt-[74px] sm:px-[30px] lg:pt-[26px]">
            {children}
          </main>
        </div>
        <PushRegister />
      </ToastProvider>
    </LangProvider>
  );
}
