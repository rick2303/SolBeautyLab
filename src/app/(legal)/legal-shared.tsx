import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";

/** Datos de contacto reales del salón para mostrarlos en las páginas legales */
export interface SalonInfo {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
}

export async function getSalonInfo(): Promise<SalonInfo> {
  const fallback: SalonInfo = {
    name: "Sol Beauty Lab",
    phone: null,
    whatsapp: null,
    instagram: null,
    address: null,
  };
  try {
    // Páginas públicas (visitante sin sesión): igual que /book, se lee con la
    // service-role porque la RLS de salon_settings solo permite authenticated.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return fallback;
    const db = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data } = await db.from("salon_settings").select("*").limit(1);
    const s = data?.[0];
    if (!s) return fallback;
    return {
      name: s.salon_name ?? fallback.name,
      phone: s.phone ?? null,
      whatsapp: s.whatsapp ?? null,
      instagram: s.instagram ?? null,
      address: s.address ?? null,
    };
  } catch {
    return fallback;
  }
}

export interface LegalSection {
  h: string;
  p: string[];
}

/** Página legal con la misma estética que /book */
export function LegalShell({
  lang,
  title,
  updated,
  sections,
  salon,
}: {
  lang: Lang;
  title: string;
  updated: string;
  sections: LegalSection[];
  salon: SalonInfo;
}) {
  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-10"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div className="anim-page mx-auto max-w-[640px]">
        <div className="mb-1 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-transparent.png"
            alt={salon.name}
            className="w-[150px]"
          />
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <h1 className="font-serif text-[24px] font-semibold">{title}</h1>
          <div className="mt-1 text-[11.5px] text-muted">{updated}</div>
          {sections.map((s) => (
            <section key={s.h} className="mt-6">
              <h2 className="font-serif text-[16px] font-semibold">{s.h}</h2>
              {s.p.map((par, i) => (
                <p
                  key={i}
                  className="mt-2 text-[13px] leading-relaxed text-body"
                >
                  {par}
                </p>
              ))}
            </section>
          ))}
          <section className="mt-6 rounded-xl border border-line bg-cream-deep p-4 text-[12.5px] leading-relaxed text-body">
            <b>{lang === "es" ? "Contacto" : "Contact"}</b>
            <br />
            {salon.name}
            {salon.address && (
              <>
                <br />
                {salon.address}
              </>
            )}
            {salon.phone && (
              <>
                <br />
                {lang === "es" ? "Teléfono" : "Phone"}: {salon.phone}
              </>
            )}
            {salon.whatsapp && (
              <>
                <br />
                WhatsApp: {salon.whatsapp}
              </>
            )}
            {salon.instagram && (
              <>
                <br />
                Instagram: @{salon.instagram.replace(/^@/, "")}
              </>
            )}
          </section>
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/book"
            className="text-[12.5px] text-[#b0863c] hover:text-gold-dark"
          >
            ‹ {lang === "es" ? "Volver a agendar" : "Back to booking"}
          </Link>
        </div>
      </div>
    </div>
  );
}
