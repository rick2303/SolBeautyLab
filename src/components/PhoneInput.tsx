"use client";

import { useState } from "react";
import {
  parsePhoneNumberFromString,
  isSupportedCountry,
  type CountryCode,
} from "libphonenumber-js";
import { inputCls } from "@/components/ui/Modal";
import { useLang } from "@/components/LangProvider";

function asCountry(c: string): CountryCode {
  return isSupportedCountry(c) ? (c as CountryCode) : "US";
}

/** E.164 normalizado (ej. +12105550123) si el número es válido; null si no. */
export function normalizePhone(
  value: string,
  defaultCountry: string
): string | null {
  const p = parsePhoneNumberFromString(value, asCountry(defaultCountry));
  return p?.isValid() ? p.number : null;
}

/**
 * Campo de teléfono con la misma validación que /book: solo dígitos y
 * separadores (un único + al inicio), validez con libphonenumber según el
 * país del salón, borde verde/rojo y formateo bonito al salir del campo.
 * Quien lo usa guarda el número con normalizePhone().
 */
export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  defaultCountry: string;
  placeholder?: string;
}) {
  const [touched, setTouched] = useState(false);
  const { t } = useLang();
  const country = asCountry(defaultCountry);
  const parsed = parsePhoneNumberFromString(value, country);
  const valid = parsed?.isValid() === true;

  return (
    <div>
      <input
        value={value}
        onChange={(e) => {
          // Solo dígitos y separadores; un único + al inicio (igual que /book)
          let v = e.target.value.replace(/[^\d\s\-()+]/g, "");
          v =
            v.charAt(0) === "+"
              ? "+" + v.slice(1).replace(/\+/g, "")
              : v.replace(/\+/g, "");
          onChange(v);
        }}
        onBlur={() => {
          setTouched(true);
          if (parsed?.isValid()) {
            onChange(
              parsed.country === country
                ? parsed.formatNational()
                : parsed.formatInternational()
            );
          }
        }}
        placeholder={placeholder ?? t("Phone")}
        inputMode="tel"
        className={`${inputCls} ${
          touched && value && !valid
            ? "!border-[#d9a0a0]"
            : valid
              ? "!border-[#a8cbb0]"
              : ""
        }`}
      />
      {touched && value.trim() !== "" && !valid && (
        <div className="mt-1 text-[11px] text-[#a05a5a]">
          {t("Enter a valid phone number")}
        </div>
      )}
    </div>
  );
}
