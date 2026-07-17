"use client";

import { useEffect, useMemo, useState } from "react";
import { SolLogo } from "@/components/SolLogo";
import { inputCls } from "@/components/ui/Modal";
import { LangToggle, useLocalLang } from "@/components/LangProvider";
import { fmtMoney, dateKey } from "@/lib/format";
import { effectiveDayHours, DOW_KEYS } from "@/lib/schedule";
import { createBooking, getBusy, type BookingData } from "./actions";

const SLOT_STEP_MIN = 30;

const STEP_TITLES = [
  "Choose your service",
  "Pick your artist",
  "Pick date & time",
  "Your details",
];

const CAT_ICON = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("nail")) return "💅";
  if (n.includes("lash")) return "✨";
  if (n.includes("barb") || n.includes("hair")) return "💈";
  if (n.includes("skin") || n.includes("facial")) return "🌿";
  return "✦";
};

export function BookingClient({ data }: { data: BookingData }) {
  const [step, setStep] = useState(1);
  const [catId, setCatId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [busy, setBusy] = useState<{ start: string; end: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot anti-bots
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const { lang, t, setLang } = useLocalLang();

  const service = data.services.find((s) => s.id === serviceId);
  const tech = data.staff.find((t) => t.id === staffId);
  const locale = lang === "es" ? "es" : "en-US";

  // Próximos 14 días (abiertos según horario del salón ∩ horario del técnico)
  const days = useMemo(() => {
    const out: { date: Date; open: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      const dow = DOW_KEYS[d.getDay()];
      const hours = effectiveDayHours(
        data.openingHours[dow] ?? null,
        tech?.work_hours,
        dow
      );
      out.push({ date: d, open: !!hours });
    }
    return out;
  }, [data.openingHours, tech]);

  // Cargar ocupación del técnico al elegir día
  useEffect(() => {
    if (!staffId || !day) return;
    setLoadingSlots(true);
    setSlot(null);
    const from = new Date(day);
    const to = new Date(day);
    to.setDate(to.getDate() + 1);
    getBusy(staffId, from.toISOString(), to.toISOString())
      .then(setBusy)
      .finally(() => setLoadingSlots(false));
  }, [staffId, day]);

  // Slots disponibles del día (dentro del horario efectivo del técnico)
  const slots = useMemo(() => {
    if (!day || !service) return [];
    const dow = DOW_KEYS[day.getDay()];
    const hours = effectiveDayHours(
      data.openingHours[dow] ?? null,
      tech?.work_hours,
      dow
    );
    if (!hours) return [];
    const [openH, openM] = hours[0].split(":").map(Number);
    const [closeH, closeM] = hours[1].split(":").map(Number);
    const open = new Date(day);
    open.setHours(openH, openM, 0, 0);
    const close = new Date(day);
    close.setHours(closeH, closeM, 0, 0);
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
    setSubmitting(true);
    setError("");
    const res = await createBooking({
      serviceId: service.id,
      staffId: tech.id,
      startISO: slot.toISOString(),
      fullName: name,
      phone,
      email,
      website,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  // ---------- Pantalla de éxito ----------
  if (done && service && tech && slot) {
    return (
      <Shell topRight={<LangToggle lang={lang} onChange={setLang} />}>
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
            })}{" "}
            ·{" "}
            {slot.toLocaleTimeString(locale, {
              hour: "numeric",
              minute: "2-digit",
            })}
            <br />
            {fmtMoney(service.price)} · {service.duration_min} min
          </div>
          <div className="mt-4 text-[12px] text-muted">
            {t("We'll send you a reminder before your appointment ✨")}
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
    <Shell topRight={<LangToggle lang={lang} onChange={setLang} />}>
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
              ☺ {tech.full_name.split(" ")[0]}
            </button>
          )}
          {slot && step > 3 && (
            <button
              onClick={() => goTo(3)}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-[20px] border border-gold-light bg-gold-pale px-3 text-[11px] font-medium text-gold-deep"
            >
              ▦{" "}
              {slot.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              ·{" "}
              {slot.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
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
                  <div className="text-[28px]">{CAT_ICON(cat.name)}</div>
                  <div className="mt-2 font-serif text-lg font-semibold">
                    {cat.name}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {items.length}{" "}
                    {items.length > 1 ? t("services") : t("service")} ·{" "}
                    {t("from")} {fmtMoney(minPrice)}
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
                    data.categories.find((c) => c.id === catId)?.name ?? ""
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
                      {fmtMoney(s.price)} · {s.duration_min} min
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
                    {t.specialty ?? "Stylist"}
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
              {days.map(({ date, open }) => {
                const selDay = day && dateKey(day) === dateKey(date);
                return (
                  <button
                    key={dateKey(date)}
                    disabled={!open}
                    onClick={() => setDay(date)}
                    className={`w-[64px] flex-none rounded-xl border py-2.5 text-center disabled:opacity-35 ${
                      selDay
                        ? "grad-gold-soft border-gold"
                        : "border-line bg-card hover:border-chip-border"
                    }`}
                  >
                    <div className="text-[10px] uppercase text-subtle">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="font-serif text-lg font-semibold">
                      {date.getDate()}
                    </div>
                    <div className="text-[9.5px] text-muted">
                      {date.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </button>
                );
              })}
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
                          {t.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
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
              })}{" "}
              ·{" "}
              {slot.toLocaleTimeString(locale, {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · <b>{fmtMoney(service.price)}</b>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Full name")}
                autoFocus
                className={inputCls}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("Phone (WhatsApp)")}
                inputMode="tel"
                className={inputCls}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("Email (optional)")}
                type="email"
                className={inputCls}
              />
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
              <div className="anim-shake mt-3 rounded-xl bg-[#f6e9e9] px-3.5 py-2.5 text-[12.5px] text-[#a05a5a]">
                {error}
              </div>
            )}
            <button
              onClick={submit}
              disabled={submitting || !name.trim() || !phone.trim()}
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
}: {
  children: React.ReactNode;
  topRight?: React.ReactNode;
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
          <SolLogo />
        </div>
        <div
          className="mb-6 text-center text-[18px] text-[#b0863c]"
          style={{ fontFamily: "var(--font-script)" }}
        >
          Luz que realza tu esencia
        </div>
        {children}
      </div>
    </div>
  );
}
