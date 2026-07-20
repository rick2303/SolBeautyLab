"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface CreateMemberInput {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  specialties: string[];
  phone: string;
}

export async function createTeamMember(
  input: CreateMemberInput
): Promise<{ ok?: true; id?: string; error?: string }> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner") {
    return { error: "Only the owner can add team members" };
  }

  if (!/^\d{6}$/.test(input.password)) {
    return { error: "Temp password must be exactly 6 digits" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API Keys → service_role). Add it and restart the server.",
    };
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim() },
  });
  if (error) return { error: error.message };

  // El trigger ya creó el profile como staff — lo actualizamos con rol y datos
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({
      id: data.user.id,
      full_name: input.full_name.trim(),
      role: input.role,
      specialties: input.specialties ?? [],
      phone: input.phone.trim() || null,
      is_active: true,
      // Contraseña temporal: se le pedirá cambiarla al primer ingreso
      must_change_password: true,
    });
  if (pErr) return { error: pErr.message };

  return { ok: true, id: data.user.id };
}
