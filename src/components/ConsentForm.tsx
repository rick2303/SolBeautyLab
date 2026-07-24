"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import type { ClientConsent } from "@/lib/types";

/** Lo que la ficha entrega al guardarse (columnas de client_consents) */
export interface ConsentPayload {
  birth_date: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  medical_conditions: string[];
  medications: string | null;
  allergies: string | null;
  chemical_acks: string[];
  photos_record: boolean;
  photos_social: boolean;
  signature: string;
}

// Llaves neutras de idioma: así lo guardado no depende del idioma de la UI
const MEDICAL: { key: string; es: string; en: string }[] = [
  { key: "diabetes", es: "Diabetes", en: "Diabetes" },
  { key: "hypertension", es: "Hipertensión", en: "Hypertension" },
  { key: "heart_disease", es: "Enfermedad cardíaca", en: "Heart disease" },
  { key: "epilepsy", es: "Epilepsia", en: "Epilepsy" },
  { key: "autoimmune", es: "Enfermedad autoinmune", en: "Autoimmune disease" },
  { key: "healing_problems", es: "Problemas de cicatrización", en: "Healing problems" },
  { key: "psoriasis", es: "Psoriasis", en: "Psoriasis" },
  { key: "dermatitis", es: "Dermatitis", en: "Dermatitis" },
  { key: "rosacea", es: "Rosácea", en: "Rosacea" },
  { key: "pregnancy", es: "Embarazo / Lactancia", en: "Pregnancy / Breastfeeding" },
];

const CHEMICAL: { key: string; es: string; en: string }[] = [
  {
    key: "allergy_informed",
    es: "He informado si tengo alergias a tintes o decolorantes.",
    en: "I have disclosed any allergies to dyes or bleach.",
  },
  {
    key: "henna_metallic_informed",
    es: "He informado si uso henna, tintes metálicos o tratamientos químicos recientes.",
    en: "I have disclosed use of henna, metallic dyes or recent chemical treatments.",
  },
  {
    key: "pregnancy_informed",
    es: "He informado si estoy embarazada, lactando o bajo tratamiento médico.",
    en: "I have disclosed if I am pregnant, breastfeeding or under medical treatment.",
  },
  {
    key: "bleach_risks",
    es: "Entiendo que la decoloración puede causar resequedad, sensibilidad, quiebre o cambios inesperados según el historial químico de mi cabello.",
    en: "I understand bleaching may cause dryness, sensitivity, breakage or unexpected changes depending on my hair's chemical history.",
  },
  {
    key: "result_not_guaranteed",
    es: "Comprendo que el resultado final depende del estado del cabello y que no se garantiza obtener exactamente el color de una fotografía de referencia.",
    en: "I understand the final result depends on my hair's condition and an exact match to a reference photo is not guaranteed.",
  },
];

const CONSENT_BODY = {
  es: "Declaro que la información proporcionada es verdadera y completa. Comprendo que todo procedimiento estético implica riesgos, incluyendo reacciones alérgicas, irritación, sensibilidad, inflamación, infección, resultados variables y/o daño cuando existen antecedentes no informados o no se siguen los cuidados posteriores. Autorizo al personal de Sol Beauty Lab a realizar el procedimiento seleccionado. Libero a Sol Beauty Lab y a su personal de responsabilidad por complicaciones derivadas de información falsa u omitida, por el incumplimiento de las indicaciones posteriores o por reacciones imprevisibles fuera del control profesional.",
  en: "I declare that the information provided is true and complete. I understand every aesthetic procedure carries risks, including allergic reactions, irritation, sensitivity, inflammation, infection, variable results and/or harm when history is not disclosed or aftercare is not followed. I authorize Sol Beauty Lab staff to perform the selected procedure. I release Sol Beauty Lab and its staff from liability for complications arising from false or omitted information, failure to follow aftercare instructions, or unforeseeable reactions beyond professional control.",
};

const POLICIES = {
  es: [
    "No hay reembolsos por servicios ya realizados.",
    "Los retoques fuera del periodo establecido generan costo adicional.",
    "El salón podrá rechazar un servicio cuando exista un riesgo para la salud del cliente o del personal.",
  ],
  en: [
    "No refunds for services already performed.",
    "Touch-ups outside the established period incur an additional cost.",
    "The salon may decline a service when there is a risk to the client's or staff's health.",
  ],
};

// ¿El servicio parece químico/de color? Solo decide si la sección 4 sale abierta
const CHEM_RE = /color|balayage|highlight|decolor|tinte|henna|fantas/i;

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mt-1 border-b border-line-2 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-gold-dark">
      {n}. {children}
    </div>
  );
}

function CheckRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 flex-none accent-[#b0863c]"
      />
      <span>{children}</span>
    </label>
  );
}

/** Pad de firma: canvas con pointer events, exporta PNG data-url */
function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#3a3128";
  }, []);

  function pos(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent) {
    e.preventDefault();
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un punto también cuenta (iniciales muy cortas)
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(ref.current?.toDataURL("image/png") ?? null);
  }

  function clear() {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative">
        <canvas
          ref={ref}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="h-[140px] w-full touch-none rounded-xl border border-input bg-white"
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-faint">
            ✎ {t("Client signs here (finger or mouse)")}
          </div>
        )}
      </div>
      {!empty && (
        <button
          onClick={clear}
          className="mt-1.5 cursor-pointer border-none bg-transparent p-0 text-[11.5px] text-[#a05a5a] underline"
        >
          {t("Clear signature")}
        </button>
      )}
    </div>
  );
}

export function ConsentForm({
  clientName,
  phone,
  serviceLabel,
  staffName,
  lastConsent,
  saving,
  onSubmit,
  onSkip,
}: {
  clientName: string;
  phone: string;
  serviceLabel: string;
  staffName: string;
  lastConsent: ClientConsent | null;
  saving: boolean;
  onSubmit: (p: ConsentPayload) => void;
  onSkip: () => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const L = lang === "es" ? "es" : "en";

  const [birthDate, setBirthDate] = useState(lastConsent?.birth_date ?? "");
  const [address, setAddress] = useState(lastConsent?.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(
    lastConsent?.emergency_contact ?? ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    lastConsent?.emergency_phone ?? ""
  );
  const [conditions, setConditions] = useState<string[]>(
    lastConsent?.medical_conditions ?? []
  );
  const [medications, setMedications] = useState(lastConsent?.medications ?? "");
  const [allergies, setAllergies] = useState(lastConsent?.allergies ?? "");
  const [showChem, setShowChem] = useState(() => CHEM_RE.test(serviceLabel));
  const [chemAcks, setChemAcks] = useState<string[]>([]);
  const [photosRecord, setPhotosRecord] = useState(
    lastConsent?.photos_record ?? false
  );
  const [photosSocial, setPhotosSocial] = useState(
    lastConsent?.photos_social ?? false
  );
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  function toggleCondition(key: string) {
    setConditions((prev) =>
      key === "none"
        ? prev.includes("none")
          ? []
          : ["none"]
        : prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev.filter((k) => k !== "none"), key]
    );
  }

  function toggleChem(key: string) {
    setChemAcks((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function submit() {
    if (!accepted) {
      toast("⚠︎ " + t("Accept the informed consent to continue"));
      return;
    }
    if (!signature) {
      toast("⚠︎ " + t("The client's signature is required"));
      return;
    }
    onSubmit({
      birth_date: birthDate || null,
      address: address.trim() || null,
      emergency_contact: emergencyContact.trim() || null,
      emergency_phone: emergencyPhone.trim() || null,
      medical_conditions: conditions,
      medications: medications.trim() || null,
      allergies: allergies.trim() || null,
      chemical_acks: chemAcks,
      photos_record: photosRecord,
      photos_social: photosSocial,
      signature,
    });
  }

  const today = new Date().toLocaleDateString(L === "es" ? "es" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      {lastConsent && (
        <div className="rounded-[10px] border border-[#cfe0d3] bg-[#eaf5ec] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#4a7d57]">
          ✓ {t("Previous form on file — fields prefilled. Review and sign again for today's service.")}
        </div>
      )}

      <SectionTitle n={1}>{t("Client information")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Full name")}
          </div>
          <div className="mt-0.5 font-medium">{clientName}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Phone")}
          </div>
          <div className="mt-0.5 font-medium">{phone}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Date")}
          </div>
          <div className="mt-0.5 font-medium">{today}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Specialist")}
          </div>
          <div className="mt-0.5 font-medium">{staffName}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Service")}
          </div>
          <div className="mt-0.5 font-medium">{serviceLabel}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("Birth date")}>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("Address")}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("Emergency contact")}>
          <input
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("Emergency phone")}>
          <input
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            inputMode="tel"
            className={inputCls}
          />
        </Field>
      </div>

      <SectionTitle n={2}>{t("Medical history")}</SectionTitle>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MEDICAL.map((m) => (
          <CheckRow
            key={m.key}
            checked={conditions.includes(m.key)}
            onToggle={() => toggleCondition(m.key)}
          >
            {m[L]}
          </CheckRow>
        ))}
        <CheckRow
          checked={conditions.includes("none")}
          onToggle={() => toggleCondition("none")}
        >
          {L === "es" ? "Ninguna" : "None"}
        </CheckRow>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("Medications")}>
          <input
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("Allergies (adhesives, latex, pigments, dyes…)")}>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <SectionTitle n={3}>{t("Chemical color services")}</SectionTitle>
      {showChem ? (
        <div className="flex flex-col gap-2">
          {CHEMICAL.map((c) => (
            <CheckRow
              key={c.key}
              checked={chemAcks.includes(c.key)}
              onToggle={() => toggleChem(c.key)}
            >
              {c[L]}
            </CheckRow>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowChem(true)}
          className="cursor-pointer self-start border-none bg-transparent p-0 text-[12px] text-[#b0863c] underline"
        >
          {t("Show this section (only for color/chemical services)")}
        </button>
      )}

      <SectionTitle n={4}>{t("Informed consent")}</SectionTitle>
      <div className="rounded-[10px] bg-tan px-3.5 py-3 text-[12px] leading-relaxed text-[#6f6659]">
        {CONSENT_BODY[L]}
      </div>
      <CheckRow checked={accepted} onToggle={() => setAccepted(!accepted)}>
        <span className="font-medium">
          {t("I have read and accept the informed consent")}
        </span>
      </CheckRow>

      <SectionTitle n={5}>{t("Photo authorization")}</SectionTitle>
      <div className="flex flex-col gap-2">
        <CheckRow
          checked={photosRecord}
          onToggle={() => setPhotosRecord(!photosRecord)}
        >
          {t("I authorize photos for the client file")}
        </CheckRow>
        <CheckRow
          checked={photosSocial}
          onToggle={() => setPhotosSocial(!photosSocial)}
        >
          {t("I authorize use on social media / advertising")}
        </CheckRow>
        {!photosRecord && !photosSocial && (
          <div className="text-[11px] text-faint">
            {t("Neither checked = no publication authorized")}
          </div>
        )}
      </div>

      <SectionTitle n={6}>{t("Policies")}</SectionTitle>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[12px] leading-relaxed text-[#6f6659]">
        {POLICIES[L].map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <SectionTitle n={7}>{t("Client signature")}</SectionTitle>
      <SignaturePad onChange={setSignature} />

      <div className="mt-1 flex gap-2.5 border-t border-line-4 pt-4">
        <GhostBtn onClick={onSkip} className="flex-1">
          {t("Skip for now")}
        </GhostBtn>
        <PrimaryBtn onClick={submit} loading={saving} className="flex-[2]">
          {saving ? t("Saving…") : t("Save signed form")}
        </PrimaryBtn>
      </div>
    </div>
  );
}
