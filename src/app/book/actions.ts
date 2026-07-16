"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Booking is not configured yet");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface BookingData {
  categories: { id: string; name: string; sort_order: number }[];
  services: {
    id: string;
    category_id: string;
    name: string;
    price: number;
    duration_min: number;
  }[];
  staff: { id: string; full_name: string; specialty: string | null }[];
  openingHours: Record<string, [string, string] | null>;
  salonName: string;
}

export async function getBookingData(): Promise<BookingData> {
  const db = admin();
  const [{ data: categories }, { data: services }, { data: staff }, { data: settings }] =
    await Promise.all([
      db.from("service_categories").select("id, name, sort_order").order("sort_order"),
      db
        .from("services")
        .select("id, category_id, name, price, duration_min")
        .eq("is_active", true)
        .order("name"),
      db
        .from("profiles")
        .select("id, full_name, specialty")
        .eq("is_active", true)
        .order("full_name"),
      db.from("salon_settings").select("salon_name, opening_hours").limit(1),
    ]);

  return {
    categories: categories ?? [],
    services: services ?? [],
    staff: staff ?? [],
    openingHours:
      (settings?.[0]?.opening_hours as BookingData["openingHours"]) ?? {},
    salonName: settings?.[0]?.salon_name ?? "Sol Beauty Lab",
  };
}

/** Intervalos ocupados de un técnico entre dos instantes (ISO) */
export async function getBusy(
  staffId: string,
  fromISO: string,
  toISO: string
): Promise<{ start: string; end: string }[]> {
  const db = admin();
  const { data } = await db
    .from("appointments")
    .select("starts_at, duration_min")
    .eq("staff_id", staffId)
    .in("status", ["scheduled", "confirmed", "in_progress"])
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO);

  return (data ?? []).map((a) => ({
    start: a.starts_at,
    end: new Date(
      new Date(a.starts_at).getTime() + a.duration_min * 60000
    ).toISOString(),
  }));
}

export interface BookingInput {
  serviceId: string;
  staffId: string;
  startISO: string;
  fullName: string;
  phone: string;
  email: string;
  website?: string; // honeypot — los humanos lo dejan vacío
}

export async function createBooking(
  input: BookingInput
): Promise<{ ok?: true; error?: string }> {
  // Honeypot: los bots rellenan el campo oculto
  if (input.website && input.website.trim() !== "") {
    return { ok: true }; // fingir éxito, no crear nada
  }

  const name = input.fullName.trim();
  const phone = input.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (
    !name ||
    name.length > 80 ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    return { error: "Please enter your name and a valid phone number" };
  }
  if (input.email && input.email.length > 120) {
    return { error: "Invalid email" };
  }

  const db = admin();

  // Anti-spam global: máx. 15 reservas online en 10 minutos
  const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
  const { count: recentGlobal } = await db
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .is("created_by", null)
    .gte("created_at", tenMinAgo);
  if ((recentGlobal ?? 0) >= 15) {
    return { error: "We're getting a lot of requests — please try again in a few minutes" };
  }

  const { data: service } = await db
    .from("services")
    .select("id, price, duration_min")
    .eq("id", input.serviceId)
    .single();
  if (!service) return { error: "Service not found" };

  const starts = new Date(input.startISO);
  if (isNaN(starts.getTime()) || starts < new Date()) {
    return { error: "That time is no longer available" };
  }
  const ends = new Date(starts.getTime() + service.duration_min * 60000);

  // Re-chequear conflicto en el servidor (evita doble reserva simultánea)
  const busy = await getBusy(
    input.staffId,
    new Date(starts.getTime() - 12 * 3600000).toISOString(),
    new Date(starts.getTime() + 12 * 3600000).toISOString()
  );
  const conflict = busy.some(
    (b) => starts < new Date(b.end) && new Date(b.start) < ends
  );
  if (conflict) {
    return { error: "Sorry, that slot was just taken — pick another time" };
  }

  // Vincular con cliente existente usando celular o correo como llave
  const email = input.email.trim().toLowerCase();
  const digits = phone.replace(/\D/g, "");
  const { data: allClients } = await db
    .from("clients")
    .select("id, phone, email");

  const phonesMatch = (a: string, b: string) => {
    if (a.length < 7 || b.length < 7) return false;
    // Igual, o uno termina en el otro (cubre +504/+1 y prefijos)
    return a === b || a.endsWith(b) || b.endsWith(a);
  };

  const match =
    (allClients ?? []).find((c) =>
      phonesMatch(c.phone.replace(/\D/g, ""), digits)
    ) ??
    (email
      ? (allClients ?? []).find(
          (c) => (c.email ?? "").toLowerCase() === email
        )
      : undefined);

  let clientId: string;
  if (match) {
    clientId = match.id;
    // Completar datos faltantes del cliente sin sobreescribir los existentes
    const patch: Record<string, string> = {};
    if (!match.email && email) patch.email = email;
    if (!match.phone && phone) patch.phone = phone;
    if (Object.keys(patch).length > 0) {
      await db.from("clients").update(patch).eq("id", match.id);
    }
  } else {
    const { data: created, error: cErr } = await db
      .from("clients")
      .insert({
        full_name: name,
        phone,
        email: email || null,
        tags: ["Online booking"],
      })
      .select("id")
      .single();
    if (cErr || !created) return { error: "Could not save your info" };
    clientId = created.id;
  }

  // Anti-spam por cliente: máx. 3 citas futuras activas
  const { count: upcoming } = await db
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .in("status", ["scheduled", "confirmed"])
    .gte("starts_at", new Date().toISOString());
  if ((upcoming ?? 0) >= 3) {
    return {
      error:
        "You already have upcoming appointments — call us to book more visits",
    };
  }

  const { error } = await db.from("appointments").insert({
    client_id: clientId,
    service_id: service.id,
    staff_id: input.staffId,
    starts_at: starts.toISOString(),
    duration_min: service.duration_min,
    price: service.price,
    status: "scheduled",
  });
  if (error) return { error: "Could not create the appointment" };

  return { ok: true };
}
