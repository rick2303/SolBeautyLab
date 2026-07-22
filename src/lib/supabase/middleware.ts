import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Borra las cookies de sesión de Supabase (sb-*) de una respuesta */
function clearAuthCookies(request: NextRequest, res: NextResponse) {
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  }
  return res;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname.startsWith("/login");
  const isChangePw = pathname.startsWith("/change-password");
  const isPublic =
    isLogin ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/reset-password") ||
    // Legales: enlazadas desde el checkbox del booking público
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    // Confirmación de cita: enlace público que recibe la clienta por SMS
    pathname.startsWith("/c/") ||
    // Rutas de cron: protegidas por CRON_SECRET (Bearer), no por sesión
    pathname.startsWith("/api/cron/");

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (!isPublic) return redirectTo("/login");
    return supabaseResponse;
  }

  // Con sesión: el estado del profile decide a dónde puede entrar.
  // Se resuelve aquí (y no en el layout) para que nunca haya dos redirects
  // contradictorios peleándose entre middleware y server component.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, must_change_password")
    .eq("id", user.id)
    .single();

  // Cuenta desactivada mientras la sesión seguía viva: cerrarla y devolver al
  // login. El aviso lo da el propio login al reintentar (no hay ruta con
  // estado pegado en la URL).
  if (profile?.is_active === false) {
    if (isLogin) return clearAuthCookies(request, supabaseResponse);
    return clearAuthCookies(request, redirectTo("/login"));
  }

  // Contraseña temporal: no puede usar la app hasta cambiarla
  if (profile?.must_change_password && !isChangePw && !isPublic) {
    return redirectTo("/change-password");
  }
  if (profile?.must_change_password && isLogin) {
    return redirectTo("/change-password");
  }
  if (isChangePw && profile && !profile.must_change_password) {
    return redirectTo("/dashboard");
  }
  if (isLogin) return redirectTo("/dashboard");

  return supabaseResponse;
}
