"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/PageHeader";
import { Field, inputCls, PrimaryBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import type { SalonSettings } from "@/lib/types";

export function SettingsClient({
  settings,
}: {
  settings: Partial<SalonSettings>;
}) {
  const [name, setName] = useState(settings.salon_name ?? "");
  const [country, setCountry] = useState(settings.default_country ?? "US");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp ?? "");
  const [instagram, setInstagram] = useState(settings.instagram ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [saving, setSaving] = useState(false);
  // Las opciones de país se generan solo en el cliente: los nombres de
  // Intl.DisplayNames difieren entre el ICU del servidor y el del navegador
  // y provocaban un error de hidratación.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const toast = useToast();
  const router = useRouter();
  const { t, lang } = useLang();

  const countryOptions = useMemo(() => {
    if (!mounted) return [];
    const dn = new Intl.DisplayNames([lang === "es" ? "es" : "en"], {
      type: "region",
    });
    return getCountries()
      .map((c) => ({
        code: c,
        name: dn.of(c) ?? c,
        calling: getCountryCallingCode(c),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }, [lang, mounted]);

  async function save() {
    if (!name.trim()) {
      toast(t("Salon name is required"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("salon_settings")
      .update({
        salon_name: name.trim(),
        default_country: country,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        instagram: instagram.trim().replace(/^@/, "") || null,
        address: address.trim() || null,
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Settings saved"));
    router.refresh();
  }

  return (
    <div className="grid max-w-[900px] grid-cols-1 gap-[18px] lg:grid-cols-2">
      {/* Negocio */}
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <div className="font-serif text-lg font-semibold">
          {t("Business")}
        </div>
        <Field label={t("Salon name")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("Country")}>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className={inputCls}
          >
            {/* Antes de montar, solo la opción actual para no romper hidratación */}
            {countryOptions.length === 0 ? (
              <option value={country}>{country}</option>
            ) : (
              countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} (+{c.calling})
                </option>
              ))
            )}
          </select>
          <div className="mt-1 text-[10.5px] text-faint">
            {t("Used to validate phone numbers in online booking")}
          </div>
        </Field>
      </Card>

      {/* Contacto */}
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <div className="font-serif text-lg font-semibold">
          {t("Contact shown in online booking")}
        </div>
        <Field label={t("Phone")}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(972) 278-8739"
            className={inputCls}
          />
        </Field>
        <Field label="WhatsApp">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(214) 541-8162"
            className={inputCls}
          />
        </Field>
        <Field label="Instagram">
          <div className="flex items-center">
            <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-input bg-cream-deep px-3 text-sm text-muted">
              @
            </span>
            <input
              value={instagram.replace(/^@/, "")}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Sol.beauty.lab"
              className={`${inputCls} rounded-l-none`}
            />
          </div>
        </Field>
        <Field label={t("Address")}>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="1401 Northwest Hwy, Suite 105 · Garland, TX 75041"
            className="w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-ink outline-none"
          />
        </Field>
      </Card>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:col-span-2">
        <PrimaryBtn
          onClick={save}
          loading={saving}
          className="w-full px-10 sm:w-auto sm:min-w-[220px]"
        >
          {t("Save settings")}
        </PrimaryBtn>
        <span className="text-[11.5px] text-muted">
          {t("Hours are set in Schedule → Salon hours")}
        </span>
      </div>
    </div>
  );
}
