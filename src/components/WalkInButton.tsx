"use client";

import { useState } from "react";
import { WalkInModal } from "@/components/WalkInModal";
import { useLang } from "@/components/LangProvider";
import type { Profile, Service, ServiceCategory } from "@/lib/types";

export function WalkInButton({
  services,
  categories,
  staff,
  me,
}: {
  services: Pick<Service, "id" | "name" | "price" | "duration_min" | "category_id">[];
  categories: Pick<ServiceCategory, "id" | "name" | "icon">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
  me: Profile;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 cursor-pointer rounded-[20px] border border-[#d9c9a8] bg-white px-[18px] text-[13px] font-medium text-gold-dark hover:bg-cream"
      >
        ✦ {t("Walk-in")}
      </button>
      {open && (
        <WalkInModal
          services={services}
          categories={categories}
          staff={staff}
          me={me}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
