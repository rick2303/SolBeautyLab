"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  parsePhoneNumberFromString,
  isSupportedCountry,
  type CountryCode,
} from "libphonenumber-js";
import { effectiveDayHours, toMin } from "@/lib/schedule";
import { onAppointmentCreated } from "@/lib/messaging";
import { SALON_TZ } from "@/lib/tz";
import type { WorkHours } from "@/lib/types";
import type { ConsentPayload } from "@/components/ConsentForm";

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Booking is not configured yet");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface BookingData {
  categories: {
    id: string;
    name: string;
    sort_order: number;
    icon: string | null;
    hide_prices?: boolean | null;
  }[];
  services: {
    id: string;
    category_id: string;
    name: string;
    price: number;
    duration_min: number;
  }[];
  staff: {
    id: string;
    full_name: string;
    specialties: string[] | null;
    work_hours: WorkHours | null;
  }[];
  openingHours: Record<string, [string, string] | null>;
  salonName: string;
  defaultCountry: string; // ISO 3166-1 alpha-2, configurable en salon_settings
  contact: {
    phone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    address: string | null;
  };
  // A dónde enviar el depósito opcional; null = no se muestra en /book
  zelle: { number: string; name: string | null } | null;
}

export async function getBookingData(): Promise<BookingData> {
  const db = admin();
  const [{ data: categories }, { data: services }, { data: staff }, { data: settings }] =
    await Promise.all([
      // select("*") + filtro en JS: no falla si la migración 014 aún no corre
      db.from("service_categories").select("*").order("sort_order"),
      db
        .from("services")
        .select("id, category_id, name, price, duration_min")
        .eq("is_active", true)
        .order("name"),
      db
        .from("profiles")
        .select("id, full_name, specialties, work_hours")
        .eq("is_active", true)
        .order("full_name"),
      // select("*"): no falla si la migración 015 aún no corre
      db.from("salon_settings").select("*").limit(1),
    ]);

  return {
    // Las categorías desactivadas no aparecen en el booking
    categories: (categories ?? []).filter(
      (c: { is_active?: boolean }) => c.is_active !== false
    ),
    services: services ?? [],
    staff: staff ?? [],
    openingHours:
      (settings?.[0]?.opening_hours as BookingData["openingHours"]) ?? {},
    salonName: settings?.[0]?.salon_name ?? "Sol Beauty Lab",
    defaultCountry: settings?.[0]?.default_country ?? "US",
    contact: {
      phone: settings?.[0]?.phone ?? null,
      whatsapp: settings?.[0]?.whatsapp ?? null,
      instagram: settings?.[0]?.instagram ?? null,
      address: settings?.[0]?.address ?? null,
    },
    zelle: settings?.[0]?.zelle_number
      ? {
          number: settings[0].zelle_number as string,
          name: (settings[0].zelle_name as string | null) ?? null,
        }
      : null,
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

/** Día de semana + minutos desde medianoche de un instante, en hora del salón */
function wallMinutes(d: Date): { dow: string; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = get("weekday").toLowerCase().slice(0, 3);
  const h = Number(get("hour")) % 24;
  return { dow, min: h * 60 + Number(get("minute")) };
}

export interface BookingInput {
  serviceId: string;
  staffId: string;
  startISO: string;
  fullName: string;
  phone: string;
  email: string;
  website?: string; // honeypot — los humanos lo dejan vacío
  depositDataUrl?: string; // comprobante de depósito (data URL de imagen), opcional
}

/**
 * Sube un comprobante en data URL al bucket con la service-role y devuelve la
 * URL pública, o null. Nunca lanza: si algo falla, la reserva sigue sin foto.
 */
async function uploadDepositDataUrl(
  db: ReturnType<typeof admin>,
  dataUrl: string
): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) return null;
    const buf = Buffer.from(m[2], "base64");
    if (buf.length === 0 || buf.length > 4 * 1024 * 1024) return null; // máx 4MB
    const ext = m[1].split("/")[1].replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${Date.now()}-${Math.round(buf.length)}-online.${ext}`;
    const { error } = await db.storage
      .from("deposit-photos")
      .upload(path, buf, { contentType: m[1], cacheControl: "3600" });
    if (error) return null;
    return db.storage.from("deposit-photos").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/** Ficha + consentimiento firmado desde /book, autenticado con el
 *  confirmation_token de la cita recién creada (solo lo conoce quien reservó). */
export async function saveBookingConsent(
  token: string,
  p: ConsentPayload,
  signerName?: string
): Promise<{ ok?: true; error?: string }> {
  if (!token || typeof token !== "string" || token.length > 64) {
    return { error: "Invalid request" };
  }
  const db = admin();
  const { data: appt } = await db
    .from("appointments")
    .select("id, client_id, staff_id, services(name)")
    .eq("confirmation_token", token)
    .single();
  if (!appt) return { error: "Appointment not found" };

  // Idempotente: si esa cita ya tiene ficha, no se duplica
  const { data: existing } = await db
    .from("client_consents")
    .select("id")
    .eq("appointment_id", appt.id)
    .limit(1);
  if ((existing ?? []).length > 0) return { ok: true };

  // Sanitizar: viene de un formulario público
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const keys = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .slice(0, 20)
          .map((x) => x.slice(0, 40))
      : [];
  const signature = typeof p.signature === "string" ? p.signature : "";
  if (
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) ||
    signature.length > 300_000
  ) {
    return { error: "Invalid signature" };
  }

  const row = {
    client_id: appt.client_id,
    appointment_id: appt.id,
    staff_id: appt.staff_id,
    service_label:
      (appt.services as unknown as { name: string } | null)?.name ?? "",
    birth_date:
      typeof p.birth_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.birth_date)
        ? p.birth_date
        : null,
    address: str(p.address, 300),
    emergency_contact: str(p.emergency_contact, 120),
    emergency_phone: str(p.emergency_phone, 40),
    medical_conditions: keys(p.medical_conditions),
    medications: str(p.medications, 300),
    allergies: str(p.allergies, 300),
    chemical_acks: keys(p.chemical_acks),
    photos_record: p.photos_record === true,
    photos_social: p.photos_social === true,
    signature,
  };
  // signer_name (mig 026): el nombre tal como se firmó; tolera columna ausente
  let res = await db
    .from("client_consents")
    .insert({ ...row, signer_name: str(signerName, 120) });
  if (res.error && /signer_name/i.test(res.error.message)) {
    res = await db.from("client_consents").insert(row);
  }
  if (res.error)
    return { error: "Could not save the form — you can sign it at the salon" };
  return { ok: true };
}

export async function createBooking(
  input: BookingInput
): Promise<{ ok?: true; error?: string; consentToken?: string }> {
  // Honeypot: los bots rellenan el campo oculto
  if (input.website && input.website.trim() !== "") {
    return { ok: true }; // fingir éxito, no crear nada
  }

  const db = admin();

  // País por defecto del salón (salon_settings.default_country, migración 015)
  const { data: settingsRows } = await db
    .from("salon_settings")
    .select("*")
    .limit(1);
  const rawCountry = settingsRows?.[0]?.default_country ?? "US";
  const defaultCountry: CountryCode = isSupportedCountry(rawCountry)
    ? rawCountry
    : "US";

  const name = input.fullName.trim();
  // Validación real de teléfono (no solo dígitos), según el país del salón
  const parsedPhone = parsePhoneNumberFromString(
    input.phone.trim(),
    defaultCountry
  );
  if (!name || name.length > 80 || parsedPhone?.isValid() !== true) {
    return { error: "Please enter your name and a valid phone number" };
  }
  const phone = parsedPhone.number; // se guarda normalizado en E.164
  if (
    input.email &&
    (input.email.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim()))
  ) {
    return { error: "Invalid email" };
  }

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

  // Validar que la cita caiga dentro del horario efectivo del técnico
  // (horas del salón ∩ horario propio), en hora de pared del salón
  const { data: staffProfile } = await db
    .from("profiles")
    .select("work_hours")
    .eq("id", input.staffId)
    .single();
  if (!staffProfile) return { error: "Technician not found" };
  const salonHours =
    (settingsRows?.[0]?.opening_hours as WorkHours | null) ?? {};
  const wall = wallMinutes(starts);
  const win = effectiveDayHours(
    salonHours[wall.dow] ?? null,
    staffProfile.work_hours as WorkHours | null,
    wall.dow
  );
  if (
    !win ||
    wall.min < toMin(win[0]) ||
    wall.min + service.duration_min > toMin(win[1])
  ) {
    return { error: "That time is outside the technician's working hours" };
  }

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
    .select("id, full_name, phone, email");

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

  // Si reservó con un nombre distinto al registrado, dejar rastro visible
  // para el equipo en las notas de la cita (el match fue por teléfono)
  const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const bookedAsNote =
    match && match.full_name && normName(match.full_name) !== normName(name)
      ? `Reservó como: ${name}`
      : null;

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

  // El mismo cliente no puede tener dos citas activas a la misma hora
  // (p. ej. reservar en línea mientras tiene un walk-in en curso)
  const { data: clientAppts } = await db
    .from("appointments")
    .select("starts_at, duration_min")
    .eq("client_id", clientId)
    .in("status", ["scheduled", "confirmed", "in_progress"])
    .gte("starts_at", new Date(starts.getTime() - 12 * 3600000).toISOString())
    .lt("starts_at", ends.toISOString());
  const selfOverlap = (clientAppts ?? []).some((a) => {
    const aStart = new Date(a.starts_at);
    const aEnd = new Date(aStart.getTime() + a.duration_min * 60000);
    return starts < aEnd && aStart < ends;
  });
  if (selfOverlap) {
    return { error: "You already have an appointment at that time" };
  }

  // Comprobante de depósito (si la clienta adjuntó uno). No bloquea la reserva.
  const depositUrl = input.depositDataUrl
    ? await uploadDepositDataUrl(db, input.depositDataUrl)
    : null;

  // Reserva en línea → la cita nace CONFIRMADA (la clienta ya la solicitó)
  const { data: created, error } = await db
    .from("appointments")
    .insert({
      client_id: clientId,
      service_id: service.id,
      staff_id: input.staffId,
      starts_at: starts.toISOString(),
      duration_min: service.duration_min,
      price: service.price,
      status: "confirmed",
      ...(bookedAsNote ? { notes: bookedAsNote } : {}),
      // Solo si hay comprobante: así la reserva no se rompe aunque la
      // migración 022 aún no se haya corrido.
      ...(depositUrl ? { deposit_url: depositUrl } : {}),
    })
    .select("id, confirmation_token")
    .single();
  if (error || !created) return { error: "Could not create the appointment" };

  // Avisa al staff (SMS + push). Sin pedir confirmación: ya está confirmada.
  // El recordatorio 1h-antes lo envía el cron. Nada de esto puede fallar
  // el booking.
  try {
    await onAppointmentCreated(created.id, { requestConfirmation: false });
  } catch {
    // ignorar: el booking ya quedó guardado
  }

  // El token permite firmar la ficha de consentimiento desde /book
  return { ok: true, consentToken: created.confirmation_token as string };
}
