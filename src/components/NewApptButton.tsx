"use client";

import { useState } from "react";
import { AppointmentModal } from "@/components/AppointmentModal";
import type { Client, Profile, Service } from "@/lib/types";

export function NewApptButton({
  clients,
  services,
  staff,
  me,
  defaultClientId,
  label = "+ New appointment",
  variant = "primary",
}: {
  clients: Pick<Client, "id" | "full_name">[];
  services: Pick<Service, "id" | "name" | "price" | "duration_min">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
  me: Profile;
  defaultClientId?: string;
  label?: string;
  variant?: "primary" | "wide";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "primary" ? (
        <button
          onClick={() => setOpen(true)}
          className="grad-gold h-10 cursor-pointer rounded-[20px] border-none px-[18px] text-[13px] font-medium text-white"
          style={{ boxShadow: "0 10px 20px -12px rgba(138,101,38,.9)" }}
        >
          {label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="grad-gold mt-5 h-[46px] w-full cursor-pointer rounded-[14px] border-none text-sm font-medium text-white"
        >
          {label}
        </button>
      )}
      {open && (
        <AppointmentModal
          clients={clients}
          services={services}
          staff={staff}
          me={me}
          defaultClientId={defaultClientId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
