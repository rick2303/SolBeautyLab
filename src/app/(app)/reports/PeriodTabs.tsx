"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { PERIODS, type Period } from "./range";

const LABEL: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
};

export function PeriodTabs({ period }: { period: Period }) {
  const router = useRouter();
  const { t } = useLang();

  return (
    <div className="flex gap-1.5 rounded-xl bg-tan p-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => router.push(`/reports?period=${p}`)}
          className={`cursor-pointer rounded-[9px] border-none px-3 py-[6px] text-xs ${
            period === p
              ? "bg-card font-medium text-gold-dark shadow-sm"
              : "bg-transparent text-[#8a8178]"
          }`}
        >
          {t(LABEL[p])}
        </button>
      ))}
    </div>
  );
}
