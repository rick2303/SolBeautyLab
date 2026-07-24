"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { PhoneInput, normalizePhone } from "@/components/PhoneInput";
import { ConsentForm, type ConsentPayload } from "@/components/ConsentForm";
import { fmtMoney, fmtTime, fmtDate } from "@/lib/format";
import type { ClientConsent, Profile, Service, ServiceCategory } from "@/lib/types";

type Step = "lookup" | "service" | "consent";

type Visit = {
  starts_at: string;
  services: { name: string } | null;
  profiles: { full_name: string } | null;
};

// Igual que en /book: mismo número aunque uno traiga prefijo de país y otro no
function phonesMatch(a: string, b: string) {
  if (a.length < 7 || b.length < 7) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

export function WalkInModal({
  services,
  categories,
  staff,
  me,
  onClose,
}: {
  services: Pick<Service, "id" | "name" | "price" | "duration_min" | "category_id">[];
  categories: Pick<ServiceCategory, "id" | "name" | "icon">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
  me: Profile;
  onClose: () => void;
}) {
  const isStaff = me.role === "staff";
  const [step, setStep] = useState<Step>("lookup");
  const [country, setCountry] = useState("US");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<{ id: string; full_name: string } | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [lastConsent, setLastConsent] = useState<ClientConsent | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [catId, setCatId] = useState("");
  const [staffId, setStaffId] = useState(isStaff ? me.id : staff[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [apptId, setApptId] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    createClient()
      .from("salon_settings")
      .select("default_country")
      .limit(1)
      .then(({ data }) =>
        setCountry((data?.[0]?.default_country as string) ?? "US")
      );
  }, []);

  const service = services.find((s) => s.id === serviceId);

  // Solo categorías con servicios activos; "Otro" agrupa lo sin categoría
  const cats = useMemo(() => {
    const known = categories.filter((c) =>
      services.some((s) => s.category_id === c.id)
    );
    const orphan = services.some(
      (s) => !categories.find((c) => c.id === s.category_id)
    );
    return orphan
      ? [...known, { id: "other", name: t("Other"), icon: null }]
      : known;
  }, [categories, services, t]);

  const activeCat = catId || (cats[0]?.id ?? "");
  const catServices = services.filter((s) =>
    activeCat === "other"
      ? !categories.find((c) => c.id === s.category_id)
      : s.category_id === activeCat
  );

  async function search() {
    const norm = normalizePhone(phone, country);
    if (!norm) {
      toast(t("Enter a valid phone number"));
      return;
    }
    setSearching(true);
    const supabase = createClient();
    const digits = norm.replace(/\D/g, "");
    const { data: all } = await supabase.from("clients").select("id, full_name, phone");
    const match =
      (all ?? []).find((c) =>
        phonesMatch((c.phone ?? "").replace(/\D/g, ""), digits)
      ) ?? null;
    setFound(match);
    setSearched(true);
    if (match) {
      setName(match.full_name);
      const [visitsRes, consentRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("starts_at, services(name), profiles!staff_id(full_name)", {
            count: "exact",
          })
          .eq("client_id", match.id)
          .eq("status", "completed")
          .order("starts_at", { ascending: false })
          .limit(3),
        // Si la migración 025 no ha corrido, esto devuelve error y lo ignoramos
        supabase
          .from("client_consents")
          .select("*")
          .eq("client_id", match.id)
          .order("signed_at", { ascending: false })
          .limit(1),
      ]);
      setVisits((visitsRes.data ?? []) as unknown as Visit[]);
      setVisitCount(visitsRes.count ?? 0);
      setLastConsent((consentRes.data?.[0] as ClientConsent | undefined) ?? null);
    } else {
      setVisits([]);
      setVisitCount(0);
      setLastConsent(null);
    }
    setSearching(false);
  }

  async function register() {
    if (!service || !staffId) {
      toast(t("Pick a service and a technician"));
      return;
    }
    const norm = normalizePhone(phone, country);
    if (!found && (!name.trim() || !norm)) {
      toast(t("Name and a valid phone are required"));
      return;
    }
    setSaving(true);
    const supabase = createClient();

    // 1) Cliente: usa el existente o créalo etiquetado como walk-in
    let cid = found?.id ?? null;
    if (!cid) {
      const { data: c, error } = await supabase
        .from("clients")
        .insert({
          full_name: name.trim(),
          phone: norm,
          tags: ["Walk-in"],
          created_by: me.id,
        })
        .select("id, full_name")
        .single();
      if (error || !c) {
        setSaving(false);
        toast(t("Could not create client:") + " " + (error?.message ?? ""));
        return;
      }
      cid = c.id;
      setFound(c);
    }

    // 2) ¿El técnico está libre AHORA? Ventana amplia hacia atrás para
    //    atrapar citas largas que empezaron antes y siguen corriendo
    const starts = new Date();
    const ends = new Date(starts.getTime() + service.duration_min * 60000);
    const { data: existing } = await supabase
      .from("appointments")
      .select("starts_at, duration_min, clients(full_name)")
      .eq("staff_id", staffId)
      .in("status", ["scheduled", "confirmed", "in_progress"])
      .gte("starts_at", new Date(starts.getTime() - 12 * 3600000).toISOString())
      .lt("starts_at", ends.toISOString());
    const conflict = (existing ?? []).find((a) => {
      const aStart = new Date(a.starts_at);
      const aEnd = new Date(aStart.getTime() + a.duration_min * 60000);
      return starts < aEnd && aStart < ends;
    });
    if (conflict) {
      setSaving(false);
      const who =
        (conflict.clients as unknown as { full_name: string } | null)
          ?.full_name ?? t("Client");
      const until = new Date(
        new Date(conflict.starts_at).getTime() + conflict.duration_min * 60000
      );
      toast(
        `⚠︎ ${t("Technician is busy")}: ${who} · ${t("until")} ${fmtTime(until.toISOString())}`
      );
      return;
    }

    // 3) La cita: empieza ya, en progreso — el calendario bloquea el slot
    const base = {
      client_id: cid,
      service_id: service.id,
      staff_id: staffId,
      starts_at: starts.toISOString(),
      duration_min: service.duration_min,
      price: service.price,
      status: "in_progress",
      created_by: me.id,
    };
    let ins = await supabase
      .from("appointments")
      .insert({ ...base, is_walk_in: true })
      .select("id")
      .single();
    // Si la migración 025 aún no corrió, la columna no existe: registra igual
    if (ins.error && /is_walk_in/i.test(ins.error.message)) {
      ins = await supabase.from("appointments").insert(base).select("id").single();
    }
    setSaving(false);
    if (ins.error || !ins.data) {
      toast(t("Could not register:") + " " + (ins.error?.message ?? ""));
      return;
    }
    setClientId(cid);
    setApptId(ins.data.id);
    toast("✓ " + t("Walk-in registered"));
    router.refresh();
    setStep("consent");
  }

  async function saveConsent(p: ConsentPayload) {
    if (!clientId) return;
    setSaving(true);
    const { error } = await createClient()
      .from("client_consents")
      .insert({
        client_id: clientId,
        appointment_id: apptId,
        staff_id: staffId,
        service_label: service?.name ?? "",
        created_by: me.id,
        ...p,
      });
    setSaving(false);
    if (error) {
      toast(t("Could not save the form:") + " " + error.message);
      return;
    }
    toast("✓ " + t("Signed form saved"));
    onClose();
    router.refresh();
  }

  const staffOptions = isStaff ? staff.filter((s) => s.id === me.id) : staff;
  const normNow = normalizePhone(phone, country);
  const canContinue = searched && (found !== null || (name.trim() && normNow));

  // ---------- paso 1: buscar cliente ----------
  if (step === "lookup") {
    return (
      <Modal
        title={t("Walk-in")}
        onClose={onClose}
        footer={
          <>
            <GhostBtn onClick={onClose} className="flex-1">
              {t("Cancel")}
            </GhostBtn>
            <PrimaryBtn
              onClick={() => setStep("service")}
              disabled={!canContinue}
              className="flex-[2]"
            >
              {t("Continue →")}
            </PrimaryBtn>
          </>
        }
      >
        <Field label={t("Phone")}>
          <div className="flex gap-2">
            <div className="flex-1">
              <PhoneInput
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  setSearched(false);
                }}
                defaultCountry={country}
              />
            </div>
            <PrimaryBtn
              onClick={search}
              loading={searching}
              className="h-11 flex-none px-4 text-[13px]"
            >
              {searching ? t("Searching…") : t("Search")}
            </PrimaryBtn>
          </div>
        </Field>

        {searched && found && (
          <div className="rounded-[14px] border border-[#e4c97e] bg-[#fdf7e8] p-3.5">
            <div className="flex items-baseline justify-between">
              <div className="text-[14px] font-semibold">{found.full_name}</div>
              <div className="text-[12px] font-medium text-gold-dark">
                {visitCount >= 5 && "✦ "}
                {visitCount}{" "}
                {visitCount === 1 ? t("visit") : t("visits")}
              </div>
            </div>
            {visits.length > 0 ? (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-[#eadfc2] pt-2">
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted">
                  {t("Last visits")}
                </div>
                {visits.map((v) => (
                  <div
                    key={v.starts_at}
                    className="flex justify-between gap-2 text-[12px]"
                  >
                    <span className="truncate">
                      {v.services?.name ?? "—"}
                      <span className="text-faint">
                        {" "}
                        · {v.profiles?.full_name ?? "—"}
                      </span>
                    </span>
                    <span className="flex-none text-muted">
                      {fmtDate(v.starts_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1.5 text-[12px] text-muted">
                {t("No completed visits yet")}
              </div>
            )}
            {lastConsent && (
              <div className="mt-2 border-t border-[#eadfc2] pt-2 text-[11.5px] text-[#4a7d57]">
                ✓ {t("Consent form on file")} · {fmtDate(lastConsent.signed_at)}
              </div>
            )}
          </div>
        )}

        {searched && !found && (
          <>
            <div className="rounded-[10px] border border-[#d5e3ef] bg-[#eef4fa] px-3.5 py-2.5 text-[12px] text-[#4a6a9f]">
              {t("New client — will be registered with this walk-in")}
            </div>
            <Field label={t("Client name")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Full name")}
                className={inputCls}
              />
            </Field>
          </>
        )}
      </Modal>
    );
  }

  // ---------- paso 2: servicio + técnico ----------
  if (step === "service") {
    const ends = service
      ? new Date(Date.now() + service.duration_min * 60000)
      : null;
    return (
      <Modal
        title={t("Walk-in")}
        onClose={onClose}
        footer={
          <>
            <GhostBtn onClick={() => setStep("lookup")} className="flex-1">
              {t("Back")}
            </GhostBtn>
            <PrimaryBtn onClick={register} loading={saving} className="flex-[2]">
              {saving ? t("Registering…") : t("Start service")}
            </PrimaryBtn>
          </>
        }
      >
        <div className="rounded-[10px] bg-tan px-3.5 py-2.5 text-[12.5px]">
          <span className="font-medium">{found?.full_name ?? name}</span>
          {found && (
            <span className="text-muted">
              {" "}
              · {visitCount} {visitCount === 1 ? t("visit") : t("visits")}
            </span>
          )}
        </div>
        <Field label={t("Service")}>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => {
              const active = c.id === activeCat;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setCatId(c.id);
                    // Si el servicio elegido no es de esta categoría, deselecciona
                    const belongs =
                      c.id === "other"
                        ? service &&
                          !categories.find((k) => k.id === service.category_id)
                        : service?.category_id === c.id;
                    if (service && !belongs) setServiceId("");
                  }}
                  className={`h-8 cursor-pointer rounded-full border px-3 text-[12px] font-medium ${
                    active
                      ? "grad-gold border-transparent text-white"
                      : "border-line bg-white text-muted hover:border-chip-border"
                  }`}
                >
                  {c.icon ?? "◇"} {c.name}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex max-h-[240px] flex-col gap-1.5 overflow-y-auto pr-0.5">
            {catServices.map((s) => {
              const selected = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13px] ${
                    selected
                      ? "grad-gold-soft border-gold"
                      : "border-line bg-white hover:border-chip-border"
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="flex-none text-[12px] text-muted">
                    {fmtMoney(s.price)} · {s.duration_min} min
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={t("Technician")}>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            disabled={isStaff}
            className={inputCls}
          >
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </Field>
        {service && ends && (
          <div className="rounded-[10px] border border-[#e4c97e] bg-[#fdf7e8] px-3.5 py-2.5 text-[12px] text-[#8a6526]">
            ◷ {t("Starts now")} · {t("ends approx.")} {fmtTime(ends.toISOString())}{" "}
            — {t("the technician will show as busy on the calendar")}
          </div>
        )}
      </Modal>
    );
  }

  // ---------- paso 3: ficha + consentimiento ----------
  return (
    <Modal title={t("Client record & consent")} onClose={onClose} width={640}>
      <ConsentForm
        clientName={found?.full_name ?? name}
        phone={normNow ?? phone}
        serviceLabel={service?.name ?? ""}
        staffName={staff.find((s) => s.id === staffId)?.full_name ?? ""}
        lastConsent={lastConsent}
        saving={saving}
        onSubmit={saveConsent}
        onSkip={() => {
          toast(t("Walk-in saved without a signed form"));
          onClose();
        }}
      />
    </Modal>
  );
}
