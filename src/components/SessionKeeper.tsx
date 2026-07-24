"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * En Android (PWA) el navegador congela los timers en segundo plano, así que
 * el auto-refresh del token de Supabase no corre y al volver a la app las
 * escrituras fallan con "JWT expired". Este componente fuerza el refresh en
 * cuanto la app vuelve a primer plano, antes de que el usuario toque nada.
 */
export function SessionKeeper() {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      // getSession() renueva el access token si ya venció (o está por vencer)
      createClient()
        .auth.getSession()
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return null;
}
