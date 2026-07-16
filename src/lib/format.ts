import type { CSSProperties } from "react";
import type { AppointmentStatus, PaymentMethod } from "@/lib/types";

export function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const AVATARS = [
  "linear-gradient(135deg,#c9a24b,#8a6526)",
  "linear-gradient(135deg,#b98a6a,#7a5240)",
  "linear-gradient(135deg,#9a8f7a,#6f6455)",
  "linear-gradient(135deg,#c78f9b,#8a5a66)",
  "linear-gradient(135deg,#8a9b8f,#566f63)",
];

export function avatarFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const STATUS_META: Record<
  AppointmentStatus,
  { color: string; bg: string; bar: string; block: CSSProperties }
> = {
  scheduled: {
    color: "#8a8178",
    bg: "#f2ece0",
    bar: "#cdbfa2",
    block: { background: "#f5eede", color: "#6f6659" },
  },
  confirmed: {
    color: "#4a6a9f",
    bg: "#e8eef7",
    bar: "#8fa8cc",
    block: { background: "#e8eef7", color: "#4a6a9f" },
  },
  in_progress: {
    color: "#b0863c",
    bg: "#f7efd9",
    bar: "#b0863c",
    block: {
      background: "#fdf7e8",
      color: "#8a6526",
      border: "1px solid #e4c97e",
    },
  },
  completed: {
    color: "#5a9f6a",
    bg: "#eaf5ec",
    bar: "#c9a24b",
    block: { background: "#eaf5ec", color: "#4a7d57" },
  },
  cancelled: {
    color: "#b06a6a",
    bg: "#f6e9e9",
    bar: "#d9b3b3",
    block: { background: "#f6e9e9", color: "#a05a5a" },
  },
  no_show: {
    color: "#b0863c",
    bg: "#f7efd9",
    bar: "#e0c98a",
    block: { background: "#f7efd9", color: "#8a6526" },
  },
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  zelle: "Zelle",
  venmo: "Venmo",
  transfer: "Transfer",
  other: "Other",
};

export const METHOD_CHIP: Record<PaymentMethod, CSSProperties> = {
  cash: { background: "#eaf5ec", color: "#4a7d57" },
  card: { background: "#e8eef7", color: "#4a6a9f" },
  zelle: { background: "#f0e9f7", color: "#7a5a9f" },
  venmo: { background: "#e3f0f4", color: "#3a7a8a" },
  transfer: { background: "#f2ece0", color: "#8a6526" },
  other: { background: "#f2ece0", color: "#8a6526" },
};

// ---------- fechas ----------
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** YYYY-MM-DD local de un Date */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rango [inicio, fin) del día local en ISO */
export function dayRange(d: Date): { from: string; to: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Rango del mes local en ISO */
export function monthRange(d: Date): { from: string; to: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
