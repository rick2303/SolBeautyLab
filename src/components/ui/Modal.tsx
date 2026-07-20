"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ModalShell({
  onClose,
  children,
  width = 440,
  align = "center",
}: {
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  align?: "center" | "right";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Solo cerrar si el gesto empieza Y termina en el fondo. Si no, al
  // seleccionar texto y soltar el botón fuera del modal, ese arrastre
  // contaba como clic en el fondo y lo cerraba a media selección.
  const startedOnBackdrop = useRef(false);
  const backdropProps = {
    onPointerDown: (e: React.PointerEvent) => {
      startedOnBackdrop.current = e.target === e.currentTarget;
    },
    onPointerUp: (e: React.PointerEvent) => {
      const closes = startedOnBackdrop.current && e.target === e.currentTarget;
      startedOnBackdrop.current = false;
      if (closes) onClose();
    },
  };

  // Cerrar con Escape + bloquear scroll del body
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Portal a <body>: evita que ancestros con transform/overflow recorten el modal
  if (!mounted) return null;

  if (align === "right") {
    return createPortal(
      <div
        {...backdropProps}
        className="anim-overlay modal-overlay fixed inset-0 z-50 flex justify-end"
      >
        <div
          className="anim-slide-right h-full max-w-[92vw] overflow-y-auto bg-cream"
          style={{ width, boxShadow: "-20px 0 60px -20px rgba(60,40,10,.4)" }}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      {...backdropProps}
      className="anim-overlay modal-overlay fixed inset-0 z-50 overflow-y-auto"
    >
      {/* El wrapper de centrado también cuenta como fondo clicable */}
      <div
        {...backdropProps}
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
      >
        <div
          className="anim-scale flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-[20px] bg-cream"
          style={{
            maxWidth: width,
            boxShadow: "0 30px 70px -25px rgba(60,40,10,.5)",
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 440,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <ModalShell onClose={onClose} width={width}>
      <div className="flex flex-none items-center justify-between border-b border-line-2 px-6 py-4 sm:py-5">
        <div className="font-serif text-[22px] font-semibold">{title}</div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-[30px] w-[30px] cursor-pointer rounded-full bg-tan text-sm text-[#8a8178] hover:bg-line"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-5">
        {children}
      </div>
      {footer && (
        <div className="flex flex-none gap-2.5 border-t border-line-4 px-6 py-4">
          {footer}
        </div>
      )}
    </ModalShell>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.05em] text-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl border border-input bg-white px-3.5 text-sm text-ink outline-none";

export function PrimaryBtn({
  children,
  onClick,
  disabled,
  loading,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`grad-gold h-[46px] cursor-pointer rounded-[14px] border-none text-sm font-medium text-white disabled:opacity-60 ${className}`}
      style={{ boxShadow: "0 12px 24px -12px rgba(138,101,38,.9)" }}
    >
      {loading && <span className="spinner mr-2" />}
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-[46px] cursor-pointer rounded-[14px] border border-[#ece2d0] bg-white text-sm text-[#8a8178] hover:bg-cream ${className}`}
    >
      {children}
    </button>
  );
}
