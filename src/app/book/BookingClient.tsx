"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parsePhoneNumberFromString,
  isSupportedCountry,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import * as Flags from "country-flag-icons/react/3x2";

/** Bandera SVG (se ve igual en todos los dispositivos, Windows incluido) */
function Flag({ code, className }: { code: string; className?: string }) {
  const C = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[
    code
  ];
  return C ? <C className={className} /> : null;
}

/** Selector de país con bandera, búsqueda y +código */
function CountrySelect({
  value,
  options,
  onChange,
  searchPlaceholder,
}: {
  value: CountryCode;
  options: { code: CountryCode; name: string; calling: string }[];
  onChange: (c: CountryCode) => void;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? options.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.code.toLowerCase() === needle ||
          ("+" + c.calling).startsWith(needle) ||
          c.calling.startsWith(needle.replace("+", ""))
      )
    : options;

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-white px-2.5 text-sm text-ink"
      >
        <Flag code={value} className="h-[14px] w-[21px] rounded-[2px]" />
        +{getCountryCallingCode(value)}
        <span className="text-[9px] text-faint">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-[264px] overflow-hidden rounded-xl border border-line-2 bg-white shadow-[0_20px_50px_-20px_rgba(60,40,10,.4)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full border-b border-line-4 px-3 text-[12.5px] outline-none"
          />
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12.5px] hover:bg-cream ${
                  c.code === value ? "bg-gold-pale" : ""
                }`}
              >
                <Flag
                  code={c.code}
                  className="h-[12px] w-[18px] flex-none rounded-[2px]"
                />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="flex-none text-[11px] text-muted">
                  +{c.calling}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-[11.5px] text-faint">—</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import { inputCls } from "@/components/ui/Modal";
import { LangToggle, useLocalLang } from "@/components/LangProvider";
import { DepositField } from "@/components/DepositField";
import { downscaleToDataUrl } from "@/lib/image";
import { fmtMoney } from "@/lib/format";
import { effectiveDayHours, DOW_KEYS } from "@/lib/schedule";
import { SALON_TZ, utcFromWall, wallParts } from "@/lib/tz";

/** Un día del calendario del salón (fecha de pared, no del navegador) */
interface SalonDay {
  y: number;
  m: number;
  d: number;
  dow: string;
  key: string;
  open: boolean;
  noon: Date; // instante de referencia para formatear etiquetas (UTC 12:00)
}
import {
  createBooking,
  getBusy,
  saveBookingConsent,
  type BookingData,
} from "./actions";
import { ConsentForm } from "@/components/ConsentForm";
import { LangProvider } from "@/components/LangProvider";
import { ToastProvider } from "@/components/ui/Toaster";

const SLOT_STEP_MIN = 30;

const STEP_TITLES = [
  "Choose your service",
  "Pick your artist",
  "Pick date & time",
  "Your details",
];

// Ícono guardado de la categoría, o heurística por nombre; flor por defecto
const CAT_ICON = (cat: { name: string; icon?: string | null }) => {
  if (cat.icon) return cat.icon;
  const n = cat.name.toLowerCase();
  if (n.includes("nail")) return "❀";
  if (n.includes("lash")) return "❋";
  if (n.includes("barb") || n.includes("hair")) return "✄";
  if (n.includes("skin") || n.includes("facial")) return "❁";
  return "❀";
};

export function BookingClient({ data }: { data: BookingData }) {
  const [step, setStep] = useState(1);
  const [catId, setCatId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [day, setDay] = useState<SalonDay | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [busy, setBusy] = useState<{ start: string; end: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode | null>(null);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [depositPreview, setDepositPreview] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false); // términos y privacidad aceptados
  const [website, setWebsite] = useState(""); // honeypot anti-bots
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Ficha + consentimiento tras reservar (opcional, se puede firmar al llegar)
  const [consentToken, setConsentToken] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentSigned, setConsentSigned] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState("");
  const errorRef = useRef<HTMLDivElement | null>(null);
  const consentErrorRef = useRef<HTMLDivElement | null>(null);

  // Al confirmar la cita, la vista cambia a la ficha (o al éxito) pero el
  // scroll seguía hasta abajo, donde estaba el botón — subir al inicio
  useEffect(() => {
    if (done) window.scrollTo({ top: 0 });
  }, [done, consentOpen]);

  // En móvil el mensaje de error del paso 4 quedaba fuera de pantalla,
  // debajo de la sección de contacto — llevarlo a la vista
  useEffect(() => {
    if (error)
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);
  useEffect(() => {
    if (consentError)
      consentErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [consentError]);
  const { lang, t, setLang } = useLocalLang();

  const service = data.services.find((s) => s.id === serviceId);
  const tech = data.staff.find((t) => t.id === staffId);
  const locale = lang === "es" ? "es" : "en-US";
  // La categoría del servicio elegido puede ocultar precios en el booking
  const hidePrice =
    data.categories.find((c) => c.id === service?.category_id)?.hide_prices ===
    true;

  // Teléfono: país del salón por defecto, cambiable con el selector de bandera
  const defaultCountry: CountryCode = isSupportedCountry(data.defaultCountry)
    ? (data.defaultCountry as CountryCode)
    : "US";
  const country = phoneCountry ?? defaultCountry;
  const parsedPhone = parsePhoneNumberFromString(phone, country);
  const phoneValid = parsedPhone?.isValid() === true;

  const emailValid =
    email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  // Lista de países con nombre localizado, bandera y +código
  const countryOptions = useMemo(() => {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    return getCountries()
      .map((c) => ({
        code: c,
        name: dn.of(c) ?? c,
        calling: getCountryCallingCode(c),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  // Próximos 14 días DEL SALÓN (fechas de pared en SALON_TZ, no del navegador
  // — así lo que se ofrece coincide siempre con lo que valida el servidor)
  const days = useMemo(() => {
    const out: SalonDay[] = [];
    const w0 = wallParts(SALON_TZ); // hoy según el reloj del salón
    for (let i = 0; i < 14; i++) {
      const ref = new Date(Date.UTC(w0.y, w0.m - 1, w0.d + i, 12));
      const y = ref.getUTCFullYear();
      const m = ref.getUTCMonth() + 1;
      const d = ref.getUTCDate();
      const dow = DOW_KEYS[ref.getUTCDay()];
      const hours = effectiveDayHours(
        data.openingHours[dow] ?? null,
        tech?.work_hours,
        dow
      );
      out.push({ y, m, d, dow, key: `${y}-${m}-${d}`, open: !!hours, noon: ref });
    }
    return out;
  }, [data.openingHours, tech]);

  // Cargar ocupación del técnico al elegir día
  useEffect(() => {
    if (!staffId || !day) return;
    setLoadingSlots(true);
    setSlot(null);
    const from = utcFromWall(SALON_TZ, day.y, day.m, day.d);
    const next = new Date(Date.UTC(day.y, day.m - 1, day.d + 1, 12));
    const to = utcFromWall(
      SALON_TZ,
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate()
    );
    // Ventana 12h hacia atrás: atrapa citas largas (p. ej. un walk-in) que
    // empezaron antes de la medianoche del día elegido y siguen corriendo
    getBusy(
      staffId,
      new Date(from.getTime() - 12 * 3600000).toISOString(),
      to.toISOString()
    )
      .then(setBusy)
      .finally(() => setLoadingSlots(false));
  }, [staffId, day]);

  // Slots disponibles del día (hora de pared del salón → instante real)
  const slots = useMemo(() => {
    if (!day || !service) return [];
    const hours = effectiveDayHours(
      data.openingHours[day.dow] ?? null,
      tech?.work_hours,
      day.dow
    );
    if (!hours) return [];
    const [openH, openM] = hours[0].split(":").map(Number);
    const [closeH, closeM] = hours[1].split(":").map(Number);
    const open = utcFromWall(SALON_TZ, day.y, day.m, day.d, openH, openM);
    const close = utcFromWall(SALON_TZ, day.y, day.m, day.d, closeH, closeM);
    const minStart = new Date(Date.now() + 60 * 60000); // 1h de anticipación

    const out: Date[] = [];
    for (
      let t = new Date(open);
      new Date(t.getTime() + service.duration_min * 60000) <= close;
      t = new Date(t.getTime() + SLOT_STEP_MIN * 60000)
    ) {
      if (t < minStart) continue;
      const end = new Date(t.getTime() + service.duration_min * 60000);
      const taken = busy.some(
        (b) => t < new Date(b.end) && new Date(b.start) < end
      );
      if (!taken) out.push(new Date(t));
    }
    return out;
  }, [day, service, busy, data.openingHours, tech]);

  function goTo(s: number) {
    setError("");
    setStep(s);
  }

  async function submit() {
    if (!service || !tech || !slot) return;
    if (!phoneValid || !parsedPhone) {
      setPhoneTouched(true);
      setError(t("Enter a valid phone number"));
      return;
    }
    if (!emailValid) {
      setEmailTouched(true);
      setError(t("Enter a valid email"));
      return;
    }
    setSubmitting(true);
    setError("");
    // Comprobante opcional: se reduce y viaja como data URL con la reserva.
    let depositDataUrl: string | undefined;
    if (depositFile) {
      try {
        depositDataUrl = await downscaleToDataUrl(depositFile);
      } catch {
        depositDataUrl = undefined; // si falla, se reserva sin comprobante
      }
    }
    const res = await createBooking({
      serviceId: service.id,
      staffId: tech.id,
      startISO: slot.toISOString(),
      fullName: name,
      phone: parsedPhone.number, // E.164 normalizado, ej. +12105550123
      email,
      website,
      depositDataUrl,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConsentToken(res.consentToken ?? null);
    setConsentOpen(!!res.consentToken);
    setDone(true);
  }

  // ---------- Ficha + consentimiento (tras reservar, opcional) ----------
  if (done && consentOpen && consentToken && service && tech && slot) {
    return (
      <Shell topRight={<LangToggle lang={lang} onChange={setLang} />} data={data}>
        <LangProvider lang={lang}>
          <ToastProvider>
            <div className="anim-scale mx-auto w-full rounded-[22px] border border-line-2 bg-card p-6">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf5ec] text-xl">
                  ✓
                </div>
                <div className="mt-2 font-serif text-[22px] font-semibold">
                  {t("You're booked,")} {name.split(" ")[0]}!
                </div>
                <div className="mx-auto mt-1.5 mb-5 max-w-[420px] text-[12.5px] leading-relaxed text-muted">
                  {t(
                    "One last step: fill your client record & consent now and skip the paperwork when you arrive"
                  )}
                </div>
              </div>
              <ConsentForm
                clientName={name}
                phone={phone}
                serviceLabel={service.name}
                staffName={tech.full_name}
                lastConsent={null}
                saving={consentSaving}
                onSubmit={async (p) => {
                  setConsentError("");
                  setConsentSaving(true);
                  const res = await saveBookingConsent(consentToken, p, name);
                  setConsentSaving(false);
                  if (res.error) {
                    setConsentError(res.error);
                    return;
                  }
                  setConsentSigned(true);
                  setConsentOpen(false);
                }}
                onSkip={() => setConsentOpen(false)}
              />
              {consentError && (
                <div
                  ref={consentErrorRef}
                  className="anim-shake mt-3 rounded-xl bg-[#f6e9e9] px-3.5 py-2.5 text-[12.5px] text-[#a05a5a]"
                >
                  {consentError}
                </div>
              )}
            </div>
          </ToastProvider>
        </LangProvider>
      </Shell>
    );
  }

  // ---------- Pantalla de éxito ----------
  if (done && service && tech && slot) {
    return (
      <Shell topRight={<LangToggle lang={lang} onChange={setLang} />} data={data}>
        <div className="anim-scale mx-auto w-full rounded-[22px] border border-line-2 bg-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf5ec] text-2xl">
            ✓
          </div>
          <div className="mt-4 font-serif text-2xl font-semibold">
            {t("You're booked,")} {name.split(" ")[0]}!
          </div>
          <div className="mt-3 rounded-[14px] bg-cream-deep p-4 text-left text-[13.5px] leading-relaxed text-warm">
            <b>{service.name}</b> {t("with")} {tech.full_name.split(" ")[0]}
            <br />
            {slot.toLocaleDateString(locale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: SALON_TZ,
            })}{" "}
            ·{" "}
            {slot.toLocaleTimeString(locale, {
              hour: "numeric",
              minute: "2-digit",
              timeZone: SALON_TZ,
            })}
            <br />
            {hidePrice
              ? `${service.duration_min} min`
              : `${fmtMoney(service.price)} · ${service.duration_min} min`}
          </div>
          {consentSigned ? (
            <div className="mt-4 rounded-[10px] border border-[#cfe0d3] bg-[#eaf5ec] px-3.5 py-2.5 text-[12px] text-[#4a7d57]">
              ✓ {t("Consent form signed — thank you!")}
            </div>
          ) : (
            consentToken && (
              <div className="mt-4 text-[12px] text-muted">
                {t("You can fill the consent form when you arrive")}
              </div>
            )
          )}
          <div className="mt-4 text-[12px] text-muted">
            {t(
              "If you need to change or cancel your appointment, reach us by phone or WhatsApp"
            )}
          </div>
          <button
            onClick={() => {
              setDone(false);
              setStep(1);
              setCatId(null);
              setServiceId("");
              setStaffId("");
              setDay(null);
              setSlot(null);
              setName("");
              setPhone("");
              setEmail("");
              setConsentToken(null);
              setConsentOpen(false);
              setConsentSigned(false);
              setConsentError("");
            }}
            className="mt-6 h-11 w-full cursor-pointer rounded-[14px] border border-chip-border bg-white text-[13px] font-medium text-gold-dark"
          >
            {t("Book another appointment")}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell topRight={<LangToggle lang={lang} onChange={setLang} />} data={data}>
      {/* Progreso */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.08em] text-subtle">
            {t("Step")} {step} {t("of")} 4
          </span>
          <span className="font-serif text-base font-semibold text-gold-dark">
            {t(STEP_TITLES[step - 1])}
          </span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? "grad-bar" : "bg-[#e7ddc9]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Resumen de selecciones (tocar para volver a ese paso) */}
      {(service || tech || slot) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {service && (
            <button
              onClick={() => goTo(1)}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-[20px] border border-gold-light bg-gold-pale px-3 text-[11px] font-medium text-gold-deep"
            >
              ✦ {service.name}
            </button>
          )}
          {tech && step > 2 && (
            <button
              onClick={() => goTo(2)}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-[20px] border border-gold-light bg-gold-pale px-3 text-[11px] font-medium text-gold-deep"
            >
              ☺︎ {tech.full_name.split(" ")[0]}
            </button>
          )}
          {slot && step > 3 && (
            <button
              onClick={() => goTo(3)}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-[20px] border border-gold-light bg-gold-pale px-3 text-[11px] font-medium text-gold-deep"
            >
              ▦{" "}
              {slot.toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
                timeZone: SALON_TZ,
              })}{" "}
              ·{" "}
              {slot.toLocaleTimeString(locale, {
                hour: "numeric",
                minute: "2-digit",
                timeZone: SALON_TZ,
              })}
            </button>
          )}
        </div>
      )}

      <div
        key={step}
        className="anim-fade rounded-[18px] border border-line-2 bg-card p-5"
      >
        {/* PASO 1 · Categoría primero, luego sus servicios */}
        {step === 1 && !catId && (
          <div className="grid grid-cols-2 gap-2.5">
            {data.categories.map((cat) => {
              const items = data.services.filter(
                (s) => s.category_id === cat.id
              );
              if (items.length === 0) return null;
              const minPrice = Math.min(...items.map((s) => Number(s.price)));
              return (
                <button
                  key={cat.id}
                  onClick={() => setCatId(cat.id)}
                  className="rounded-2xl border border-line bg-card px-4 py-6 text-center transition-shadow hover:border-chip-border hover:shadow-[0_14px_30px_-18px_rgba(90,60,10,.5)]"
                >
                  <div className="text-[28px]">{CAT_ICON(cat)}</div>
                  <div className="mt-2 font-serif text-lg font-semibold">
                    {cat.name}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {items.length}{" "}
                    {items.length > 1 ? t("services") : t("service")}
                    {cat.hide_prices !== true && (
                      <>
                        {" "}
                        · {t("from")} {fmtMoney(minPrice)}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && catId && (
          <div className="anim-fade">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif text-lg font-semibold">
                <span>
                  {CAT_ICON(
                    data.categories.find((c) => c.id === catId) ?? { name: "" }
                  )}
                </span>
                {data.categories.find((c) => c.id === catId)?.name}
              </div>
              <button
                onClick={() => setCatId(null)}
                className="flex h-8 cursor-pointer items-center gap-1 rounded-[20px] border border-line-2 bg-white px-3 text-[11.5px] text-[#8a8178] hover:bg-cream"
              >
                ‹ {t("Categories")}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {data.services
                .filter((s) => s.category_id === catId)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setSlot(null);
                      goTo(2);
                    }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left ${
                      serviceId === s.id
                        ? "grad-gold-soft border-gold"
                        : "border-line bg-card hover:border-chip-border"
                    }`}
                  >
                    <span className="text-[13.5px] font-medium">{s.name}</span>
                    <span className="text-[12.5px] text-gold-dark">
                      {data.categories.find((c) => c.id === catId)
                        ?.hide_prices === true
                        ? `${s.duration_min} min`
                        : `${fmtMoney(s.price)} · ${s.duration_min} min`}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* PASO 2 · Artista */}
        {step === 2 && (
          <div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {data.staff.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id !== staffId) setDay(null); // otro técnico = otro horario
                    setStaffId(t.id);
                    setSlot(null);
                    goTo(3);
                  }}
                  className={`rounded-xl border px-3 py-4 text-center ${
                    staffId === t.id
                      ? "grad-gold-soft border-gold"
                      : "border-line bg-card hover:border-chip-border"
                  }`}
                >
                  <div
                    className="grad-gold mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                  >
                    {t.full_name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="text-[13px] font-medium">
                    {t.full_name.split(" ")[0]}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted">
                    {t.specialties?.length
                      ? t.specialties.join(" · ")
                      : "Stylist"}
                  </div>
                </button>
              ))}
            </div>
            <BackBtn onClick={() => goTo(1)} />
          </div>
        )}

        {/* PASO 3 · Fecha y hora */}
        {step === 3 && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((sd) => {
                const selDay = day?.key === sd.key;
                return (
                  <button
                    key={sd.key}
                    disabled={!sd.open}
                    onClick={() => setDay(sd)}
                    className={`w-[64px] flex-none rounded-xl border py-2.5 text-center disabled:opacity-35 ${
                      selDay
                        ? "grad-gold-soft border-gold"
                        : "border-line bg-card hover:border-chip-border"
                    }`}
                  >
                    <div className="text-[10px] uppercase text-subtle">
                      {sd.noon.toLocaleDateString(locale, {
                        weekday: "short",
                        timeZone: "UTC",
                      })}
                    </div>
                    <div className="font-serif text-lg font-semibold">
                      {sd.d}
                    </div>
                    <div className="text-[9.5px] text-muted">
                      {sd.noon.toLocaleDateString(locale, {
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mb-1 text-center text-[10.5px] text-faint">
              {t("Times are in the salon's local time")}
            </div>

            {!day && (
              <div className="py-6 text-center text-[12.5px] text-faint">
                {t("Pick a day to see available times")}
              </div>
            )}
            {day && (
              <div className="mt-2">
                {loadingSlots ? (
                  <div className="py-6 text-center text-[12px] text-muted">
                    <span className="spinner spinner-gold mr-2" />
                    {t("Checking availability…")}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-faint">
                    {t("No free slots this day — try another date")}
                  </div>
                ) : (
                  <div className="anim-fade grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((t) => {
                      const selSlot = slot?.getTime() === t.getTime();
                      return (
                        <button
                          key={t.getTime()}
                          onClick={() => {
                            setSlot(t);
                            goTo(4);
                          }}
                          className={`h-10 rounded-[10px] border text-[12.5px] ${
                            selSlot
                              ? "grad-gold border-transparent font-medium text-white"
                              : "border-line bg-card text-body hover:border-chip-border"
                          }`}
                        >
                          {t.toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: SALON_TZ,
                          })}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <BackBtn onClick={() => goTo(2)} />
          </div>
        )}

        {/* PASO 4 · Datos y confirmación */}
        {step === 4 && service && tech && slot && (
          <div>
            <div className="mb-4 rounded-xl bg-cream-deep p-3.5 text-[12.5px] leading-relaxed text-warm">
              <b>{service.name}</b> {t("with")} {tech.full_name.split(" ")[0]}
              <br />
              {slot.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: SALON_TZ,
              })}{" "}
              ·{" "}
              {slot.toLocaleTimeString(locale, {
                hour: "numeric",
                minute: "2-digit",
                timeZone: SALON_TZ,
              })}
              {!hidePrice && (
                <>
                  {" "}
                  · <b>{fmtMoney(service.price)}</b>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Full name")}
                autoFocus
                className={inputCls}
              />
              <div>
                <div className="flex gap-1.5">
                  <CountrySelect
                    value={country}
                    options={countryOptions}
                    onChange={(c) => setPhoneCountry(c)}
                    searchPlaceholder={t("Search country…")}
                  />
                  <input
                    value={phone}
                    onChange={(e) => {
                      // Solo dígitos y separadores; un único + al inicio
                      let v = e.target.value.replace(/[^\d\s\-()+]/g, "");
                      v =
                        v.charAt(0) === "+"
                          ? "+" + v.slice(1).replace(/\+/g, "")
                          : v.replace(/\+/g, "");
                      setPhone(v);
                      // Si escribe +código de otro país, sincronizar la bandera
                      if (v.startsWith("+")) {
                        const p = parsePhoneNumberFromString(v);
                        if (p?.country) setPhoneCountry(p.country);
                      }
                    }}
                    onBlur={() => {
                      setPhoneTouched(true);
                      // Al salir del campo, formatear bonito si es válido
                      if (parsedPhone?.isValid()) {
                        setPhone(
                          parsedPhone.country === country
                            ? parsedPhone.formatNational()
                            : parsedPhone.formatInternational()
                        );
                      }
                    }}
                    placeholder={t("Phone")}
                    inputMode="tel"
                    className={`${inputCls} ${
                      phoneTouched && phone && !phoneValid
                        ? "!border-[#d9a0a0]"
                        : phoneValid
                          ? "!border-[#a8cbb0]"
                          : ""
                    }`}
                  />
                </div>
                {phoneTouched && phone && !phoneValid && (
                  <div className="mt-1 text-[11px] text-[#a05a5a]">
                    {t("Enter a valid phone number")}
                  </div>
                )}
              </div>
              <div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder={t("Email (optional)")}
                  type="email"
                  className={`${inputCls} ${
                    emailTouched && !emailValid ? "!border-[#d9a0a0]" : ""
                  }`}
                />
                {emailTouched && !emailValid && (
                  <div className="mt-1 text-[11px] text-[#a05a5a]">
                    {t("Enter a valid email")}
                  </div>
                )}
              </div>
              <div>
                {data.zelle && (
                  <div className="mb-2 rounded-xl border border-line bg-white px-3.5 py-2.5">
                    <div className="text-[11px] text-muted">
                      {t("Send the optional deposit via Zelle to:")}
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-body">
                      {data.zelle.number}
                      {data.zelle.name ? ` · ${data.zelle.name}` : ""}
                    </div>
                  </div>
                )}
                <DepositField
                  preview={depositPreview}
                  label={t("Attach deposit receipt")}
                  hint={t(
                    "Optional — a small deposit as a sign of commitment to hold your appointment. It's not the full service payment, and it's deducted from your total on the day of your visit."
                  )}
                  onPick={(file, url) => {
                    setDepositFile(file);
                    setDepositPreview(url);
                  }}
                  onClear={() => {
                    setDepositFile(null);
                    setDepositPreview(null);
                  }}
                  disabled={submitting}
                />
              </div>
              {/* Aceptar términos y privacidad — requisito para confirmar */}
              <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-body">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-[#8a6526]"
                />
                <span>
                  {t("I have read and accept the")}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener"
                    className="font-medium text-gold-dark underline underline-offset-2"
                  >
                    {t("Terms & Conditions")}
                  </a>{" "}
                  {t("and the")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener"
                    className="font-medium text-gold-dark underline underline-offset-2"
                  >
                    {t("Privacy Policy")}
                  </a>
                </span>
              </label>
              {/* Honeypot — invisible para humanos */}
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />
            </div>
            {error && (
              <div
                ref={errorRef}
                className="anim-shake mt-3 rounded-xl bg-[#f6e9e9] px-3.5 py-2.5 text-[12.5px] text-[#a05a5a]"
              >
                {error}
              </div>
            )}
            <button
              onClick={submit}
              disabled={submitting || !name.trim() || !phone.trim() || !agreed}
              className="grad-gold mt-4 h-12 w-full cursor-pointer rounded-[14px] border-none text-[15px] font-medium text-white disabled:opacity-50"
              style={{ boxShadow: "0 12px 24px -12px rgba(138,101,38,.9)" }}
            >
              {submitting && <span className="spinner mr-2" />}
              {submitting ? t("Booking…") : t("Confirm appointment")}
            </button>
            <BackBtn onClick={() => goTo(3)} />
          </div>
        )}
      </div>
    </Shell>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 flex h-9 cursor-pointer items-center gap-1 rounded-[20px] border border-line-2 bg-white px-3.5 text-[12px] text-[#8a8178] hover:bg-cream"
    >
      ‹ Back
    </button>
  );
}

function Shell({
  children,
  topRight,
  data,
}: {
  children: React.ReactNode;
  topRight?: React.ReactNode;
  data: BookingData;
}) {
  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-10"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div className="anim-page relative mx-auto max-w-[560px]">
        {topRight && <div className="absolute right-0 top-0">{topRight}</div>}
        <div className="mb-1 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-transparent.png"
            alt="Sol Beauty Lab"
            className="w-[168px]"
          />
        </div>
        <div
          className="mb-6 text-center text-[18px] text-[#b0863c]"
          style={{ fontFamily: "var(--font-script)" }}
        >
          Luz que realza tu esencia
        </div>
        {children}
        <SalonInfo data={data} />
      </div>
    </div>
  );
}

// ---- Íconos SVG (vectoriales, nítidos en cualquier pantalla) ----
const svg = "h-[18px] w-[18px]";

function PhoneIcon() {
  return (
    <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function WhatsappIcon() {
  return (
    <svg className={svg} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.44 9.91-9.9C21.95 6.45 17.5 2 12.04 2zm5.8 14.11c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.12.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.02 0-1.44.76-2.14 1.03-2.43.27-.29.58-.37.78-.37.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.14.12.31.02.5-.09.19-.14.31-.28.47-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.11.07.65-.17 1.33z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

// "HH:MM" (24h) → "9:00 AM" / "8:00 PM"
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_FULL: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Agrupa días consecutivos con el mismo horario: "Mon – Fri · 10 AM – 8 PM" */
function formatHours(
  oh: Record<string, [string, string] | null>,
  t: (s: string) => string
): { days: string; hours: string }[] {
  const groups: { start: string; end: string; sig: string; v: [string, string] | null }[] = [];
  for (const key of WEEK_ORDER) {
    const v = oh[key] ?? null;
    const sig = v ? `${v[0]}-${v[1]}` : "closed";
    const last = groups[groups.length - 1];
    if (last && last.sig === sig) last.end = key;
    else groups.push({ start: key, end: key, sig, v });
  }
  return groups.map((g) => ({
    days:
      g.start === g.end
        ? t(DAY_FULL[g.start])
        : `${t(DAY_FULL[g.start])} – ${t(DAY_FULL[g.end])}`,
    hours: g.v ? `${to12h(g.v[0])} – ${to12h(g.v[1])}` : t("Closed"),
  }));
}

/** Datos de contacto y horario del salón, al pie del booking */
function SalonInfo({ data }: { data: BookingData }) {
  const { t } = useLocalLang();
  const { phone, whatsapp, instagram, address } = data.contact;

  const digits = (s: string) => s.replace(/\D/g, "");
  // tel:/wa.me a E.164: si es un número local de 10 díg. se antepone +1 (US)
  const e164 = (s: string) => {
    const d = digits(s);
    return d.length === 10 ? `1${d}` : d;
  };
  const ig = instagram?.replace(/^@/, "").trim();

  const contacts = [
    phone && {
      icon: <PhoneIcon />,
      sub: t("Call"),
      label: phone,
      href: `tel:+${e164(phone)}`,
    },
    whatsapp && {
      icon: <WhatsappIcon />,
      sub: "WhatsApp",
      label: whatsapp,
      href: `https://wa.me/${e164(whatsapp)}`,
    },
    ig && {
      icon: <InstagramIcon />,
      sub: "Instagram",
      label: `@${ig}`,
      href: `https://instagram.com/${ig}`,
    },
    address && {
      icon: <PinIcon />,
      sub: t("Location"),
      label: address,
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    sub: string;
    label: string;
    href: string;
  }[];

  const hours = formatHours(data.openingHours, t);
  const hasContact = contacts.length > 0;

  // Sin datos de contacto ni horario: no mostramos la tarjeta
  if (!hasContact && hours.length === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-[20px] border border-line-2 bg-card">
      <div
        className={`grid grid-cols-1 ${hasContact ? "sm:grid-cols-2" : ""}`}
      >
        {/* Contacto */}
        {hasContact && (
        <div className="p-5">
          <div className="mb-3 text-[11px] uppercase tracking-[0.1em] text-muted">
            {t("Get in touch")}
          </div>
          <div className="flex flex-col gap-1">
            {contacts.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target={c.href.startsWith("tel:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-[12px] p-2 transition-colors hover:bg-cream-deep"
              >
                <span className="grad-gold-soft flex h-9 w-9 flex-none items-center justify-center rounded-full text-gold-deep">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  {c.sub && (
                    <span className="block text-[10.5px] uppercase tracking-[0.05em] text-faint">
                      {c.sub}
                    </span>
                  )}
                  <span className="block text-[13px] font-medium leading-snug text-warm group-hover:text-gold-dark">
                    {c.label}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
        )}

        {/* Horario */}
        {hours.length > 0 && (
          <div
            className={`p-5 ${
              hasContact
                ? "border-t border-line-3 bg-cream-deep/40 sm:border-l sm:border-t-0"
                : ""
            }`}
          >
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted">
              <span className="text-gold-deep">
                <ClockIcon />
              </span>
              {t("Hours")}
            </div>
            <div className="flex flex-col gap-2.5">
              {hours.map((row) => (
                <div
                  key={row.days}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-[13px] text-muted">{row.days}</span>
                  <span className="text-right text-[13px] font-medium text-warm">
                    {row.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
