import type { Profile, Role } from "@/lib/types";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  href: string;
  pro?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "◇", href: "/dashboard" },
  { key: "calendar", label: "Calendar", icon: "▦", href: "/calendar" },
  { key: "clients", label: "Clients", icon: "♛", href: "/clients" },
  { key: "services", label: "Services", icon: "✦", href: "/services" },
  { key: "payments", label: "Payments", icon: "$", href: "/payments" },
  { key: "expenses", label: "Expenses", icon: "▤", href: "/expenses" },
  { key: "team", label: "Team", icon: "☺", href: "/team" },
  { key: "reports", label: "Reports", icon: "◔", href: "/reports" },
  { key: "reminders", label: "Reminders", icon: "✉", href: "/reminders", pro: true },
];

export const ALL_MODULES = NAV_ITEMS.map((n) => n.key);

/** Permisos extra que no son páginas del nav */
export const EXTRA_PERMISSIONS: { key: string; label: string; icon: string }[] =
  [{ key: "calendar_all", label: "Team calendar", icon: "👥" }];

export const ALL_PERMISSION_KEYS = [
  ...ALL_MODULES,
  ...EXTRA_PERMISSIONS.map((e) => e.key),
];

export const DEFAULT_MODULES: Record<Role, string[]> = {
  owner: ALL_PERMISSION_KEYS,
  receptionist: [
    "dashboard",
    "calendar",
    "clients",
    "services",
    "payments",
    "calendar_all",
  ],
  staff: ["dashboard", "calendar", "clients"],
};

type ProfileLike = Pick<Profile, "role"> & { modules?: string[] | null };

/** Módulos efectivos: owner siempre todo; si no, overrides o defaults del rol */
export function modulesFor(p: ProfileLike): string[] {
  if (p.role === "owner") return ALL_PERMISSION_KEYS;
  return p.modules ?? DEFAULT_MODULES[p.role];
}

export function navFor(p: ProfileLike): NavItem[] {
  const mods = modulesFor(p);
  return NAV_ITEMS.filter((n) => mods.includes(n.key));
}

export function canAccess(p: ProfileLike, key: string): boolean {
  return modulesFor(p).includes(key);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  receptionist: "Receptionist",
  staff: "Staff",
};
