"use client";

import { useLang } from "@/components/LangProvider";

export const PAGE_SIZE = 15;

export function Pagination({
  page,
  total,
  perPage = PAGE_SIZE,
  onChange,
}: {
  page: number; // 0-indexed
  total: number;
  perPage?: number;
  onChange: (page: number) => void;
}) {
  const { t } = useLang();
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const from = page * perPage + 1;
  const to = Math.min(total, (page + 1) * perPage);

  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11.5px] text-muted">
        {from}–{to} {t("of")} {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="h-8 cursor-pointer rounded-full border border-line-2 bg-card px-3 text-xs text-body disabled:cursor-default disabled:opacity-40"
        >
          {t("‹ Prev")}
        </button>
        <span className="min-w-[54px] text-center text-[11.5px] text-body">
          {page + 1} / {pages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages - 1}
          className="h-8 cursor-pointer rounded-full border border-line-2 bg-card px-3 text-xs text-body disabled:cursor-default disabled:opacity-40"
        >
          {t("Next ›")}
        </button>
      </div>
    </div>
  );
}
