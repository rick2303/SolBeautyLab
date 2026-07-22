"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImage } from "@/lib/image";
import { readLangCookie } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

const BUCKET = "deposit-photos";

/**
 * Sube un comprobante (imagen) al bucket de depósitos y devuelve su URL
 * pública, o null si falla. Se usa desde el equipo autenticado (nueva cita
 * y calendario). En /book la subida la hace el servidor con la service-role.
 */
export async function uploadDeposit(file: File): Promise<string | null> {
  try {
    const blob = await downscaleImage(file);
    const supabase = createClient();
    const path = `${Date.now()}-${Math.floor(Math.random() * 1e6)}-receipt.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600" });
    if (error) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function ReceiptIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="8.5" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Campo para adjuntar/mostrar un comprobante de depósito. El padre decide qué
 * hacer con el archivo elegido (subirlo directo o mandarlo al servidor).
 */
export function DepositField({
  preview,
  onPick,
  onClear,
  label,
  hint,
  disabled,
}: {
  preview: string | null;
  onPick: (file: File, previewUrl: string) => void;
  onClear: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // La cookie funciona dentro y fuera del LangProvider (app y /book).
  // "Cambiar/Quitar" solo aparecen tras elegir archivo (siempre en cliente),
  // así que no hay desajuste de hidratación.
  const t = (s: string) => tr(readLangCookie(), s);

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f, URL.createObjectURL(f));
          if (ref.current) ref.current.value = "";
        }}
      />
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="deposit"
            className="h-14 w-14 rounded-[10px] border border-line object-cover"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => ref.current?.click()}
              className="h-8 cursor-pointer rounded-[9px] border border-input bg-white px-3 text-[12px] font-medium text-gold-dark disabled:opacity-50"
            >
              {t("Change")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="h-8 cursor-pointer rounded-[9px] border border-input bg-white px-3 text-[12px] text-[#a05a5a] disabled:opacity-50"
            >
              {t("Remove")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-white text-[12.5px] font-medium text-gold-dark disabled:opacity-50"
        >
          <ReceiptIcon />
          {label}
        </button>
      )}
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
