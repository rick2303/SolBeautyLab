import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Cliente con la sesión garantizada fresca. Úsalo en mutaciones críticas
 * (pagos, citas, fichas): en Android PWA el timer de auto-refresh se
 * congela en segundo plano y el token puede llegar caducado — getSession()
 * lo renueva si hace falta antes de disparar el insert/update.
 */
export async function createFreshClient() {
  const supabase = createClient();
  try {
    await supabase.auth.getSession();
  } catch {
    // Sin red no hay refresh posible; la mutación fallará con su propio error
  }
  return supabase;
}
