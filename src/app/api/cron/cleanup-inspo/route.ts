import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET = "inspo-photos";
const MAX_AGE_DAYS = 30;

/**
 * Borra fotos de inspiración con más de 30 días de subidas.
 * Disparador: Vercel Cron (vercel.json) u otro programador externo,
 * siempre con `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Missing service key" }, { status: 500 });
  }
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const toDelete: string[] = [];

  // Raíz del bucket = una "carpeta" por cita
  const { data: folders, error: rootErr } = await admin.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (rootErr) {
    return NextResponse.json({ error: rootErr.message }, { status: 500 });
  }

  for (const folder of folders ?? []) {
    // Los archivos sueltos en la raíz no siguen la convención — se ignoran
    if (folder.id !== null) continue;
    const { data: files } = await admin.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1000 });
    for (const f of files ?? []) {
      if (f.name === ".emptyFolderPlaceholder") continue;
      if (f.created_at && new Date(f.created_at).getTime() < cutoff) {
        toDelete.push(`${folder.name}/${f.name}`);
      }
    }
  }

  if (toDelete.length > 0) {
    const { error } = await admin.storage.from(BUCKET).remove(toDelete);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, deleted: toDelete.length });
}
