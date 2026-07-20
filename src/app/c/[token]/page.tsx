import { createClient as createAdmin } from "@supabase/supabase-js";
import { SolLogo } from "@/components/SolLogo";
import { fmtDateSalon, fmtTimeSalon } from "@/lib/messaging";

export const metadata = { title: "Confirm your appointment" };
export const dynamic = "force-dynamic";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = admin();

  const { data: appt } = await db
    .from("appointments")
    .select(
      "id, starts_at, status, clients(full_name), services(name), profiles!staff_id(full_name)"
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  let state: "confirmed" | "already" | "cancelled" | "invalid" = "invalid";
  if (appt) {
    if (appt.status === "cancelled" || appt.status === "no_show") {
      state = "cancelled";
    } else if (appt.status === "confirmed") {
      state = "already";
    } else {
      // scheduled → marcar confirmada
      await db
        .from("appointments")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", appt.id);
      state = "confirmed";
    }
  }

  const client = (appt?.clients as unknown as { full_name: string } | null)
    ?.full_name;
  const service = (appt?.services as unknown as { name: string } | null)?.name;
  const staff = (appt?.profiles as unknown as { full_name: string } | null)
    ?.full_name;

  const TITLE: Record<typeof state, string> = {
    confirmed: "¡Cita confirmada!",
    already: "Tu cita ya estaba confirmada",
    cancelled: "Esta cita fue cancelada",
    invalid: "Enlace no válido",
  };
  const SUB: Record<typeof state, string> = {
    confirmed: "Te esperamos. Gracias por confirmar.",
    already: "No necesitas hacer nada más.",
    cancelled: "Contáctanos para reagendar.",
    invalid: "El enlace es incorrecto o expiró.",
  };
  const ok = state === "confirmed" || state === "already";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div className="anim-scale w-[400px] max-w-full rounded-[22px] border border-line-2 bg-card p-8 text-center">
        <SolLogo size="sm" />
        <div
          className={`mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            ok ? "bg-[#eaf5ec] text-[#4a7d57]" : "bg-[#f6e9e9] text-[#a05a5a]"
          }`}
        >
          {ok ? "✓" : "✕"}
        </div>
        <div className="mt-4 font-serif text-2xl font-semibold">
          {TITLE[state]}
        </div>
        <p className="mt-1.5 text-[13px] text-muted">{SUB[state]}</p>

        {appt && state !== "invalid" && (
          <div className="mt-4 rounded-[14px] bg-cream-deep p-4 text-left text-[13.5px] leading-relaxed text-warm">
            {client && (
              <>
                <b>{client}</b>
                <br />
              </>
            )}
            {service}
            {staff ? ` · ${staff.split(" ")[0]}` : ""}
            <br />
            {fmtDateSalon(appt.starts_at)} · {fmtTimeSalon(appt.starts_at)}
          </div>
        )}
      </div>
    </div>
  );
}
