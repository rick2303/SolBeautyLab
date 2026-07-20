"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { avatarFor, fmtMoney, initialsOf } from "@/lib/format";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_MODULES,
  EXTRA_PERMISSIONS,
  NAV_ITEMS,
  ROLE_LABEL,
} from "@/lib/roles";

const PERM_ITEMS = [
  ...NAV_ITEMS.map((n) => ({ key: n.key, label: n.label, icon: n.icon })),
  ...EXTRA_PERMISSIONS,
];
import { WorkHoursEditor } from "@/components/WorkHoursEditor";
import type { Profile, Role, ServiceCategory, WorkHours } from "@/lib/types";
import { createTeamMember } from "./actions";

interface Row {
  member: Profile;
  todayCount: number;
  servicesCount: number;
  revenue: number;
}

type Category = Pick<ServiceCategory, "id" | "name" | "icon">;

export function TeamClient({
  me,
  rows,
  salonHours,
  categories,
}: {
  me: Profile;
  rows: Row[];
  salonHours: WorkHours;
  categories: Category[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const { t } = useLang();
  // Crear miembros y editar roles/permisos es exclusivo de la dueña: si se
  // muestran a otros, la base de datos los rechaza y la acción falla en
  // silencio (0 filas afectadas, sin error visible).
  const canManage = me.role === "owner";

  return (
    <>
      {canManage && (
        <div className="mb-3.5 flex justify-end">
          <button
            onClick={() => setAdding(true)}
            className="grad-gold h-9 cursor-pointer rounded-[20px] border-none px-4 text-[12.5px] font-medium text-white"
          >
            {t("+ Add team member")}
          </button>
        </div>
      )}

      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map(({ member: m, todayCount, servicesCount, revenue }) => (
          <div
            key={m.id}
            className={`rounded-2xl border border-line bg-card p-[18px] ${
              !m.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-lg font-medium text-white"
                style={{ background: avatarFor(m.id) }}
              >
                {initialsOf(m.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[15.5px] font-medium">
                  <span className="truncate">{m.full_name}</span>
                  {!m.is_active && (
                    <span className="rounded-[20px] bg-tan px-2 py-0.5 text-[9px] tracking-[0.08em] text-[#8a8178]">
                      {t("INACTIVE")}
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-muted">
                  {m.specialties?.length ? `${m.specialties.join(" · ")} · ` : ""}
                  {t(ROLE_LABEL[m.role])}
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-[22px] font-semibold">
                  {todayCount}
                </div>
                <div className="text-[10px] text-muted">{t("today")}</div>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-3.5 border-t border-line-3 pt-3.5">
              <div className="flex-1">
                <div className="text-[11px] text-muted">
                  {t("Services this month")}
                </div>
                <div className="font-serif text-base font-semibold">
                  {servicesCount}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-muted">{t("Revenue")}</div>
                <div className="font-serif text-base font-semibold">
                  {fmtMoney(revenue)}
                </div>
              </div>
              {canManage && m.id !== me.id && (
                <button
                  onClick={() => setEditing(m)}
                  className="h-8 cursor-pointer rounded-lg border border-[#ece2d0] bg-white px-3 text-xs text-gold-dark"
                >
                  {t("Manage")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <AddMemberModal
          salonHours={salonHours}
          categories={categories}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <ManageMemberModal
          member={editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

const ROLES: Role[] = ["staff", "receptionist", "owner"];

function genTempPassword(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface CreatedMember {
  id: string;
  email: string;
  password: string;
}

function AddMemberModal({
  salonHours,
  categories,
  onClose,
}: {
  salonHours: WorkHours;
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [role, setRole] = useState<Role>("staff");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"form" | "credentials" | "schedule">("form");
  const [created, setCreated] = useState<CreatedMember | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim() || !email.trim() || !/^\d{6}$/.test(password)) {
      toast(t("Name, email & a 6-digit temp password are required"));
      return;
    }
    setSaving(true);
    const res = await createTeamMember({
      full_name: name,
      email,
      password,
      role,
      specialties,
      phone,
    });
    setSaving(false);
    if (res.error || !res.id) {
      toast(res.error ?? t("Could not save:"));
      return;
    }
    router.refresh();
    setCreated({ id: res.id, email: email.trim(), password });
    setStep("credentials");
  }

  function copyCreds() {
    navigator.clipboard
      .writeText(`${created?.email} / ${created?.password}`)
      .then(() => toast(t("Copied")));
  }

  if (step === "schedule" && created) {
    return (
      <Modal
        title={`${t("Set schedule")} · ${name.split(" ")[0]}`}
        onClose={onClose}
        footer={
          <GhostBtn onClick={onClose} className="w-full">
            {t("Skip for now")}
          </GhostBtn>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-muted">
          {t("When does")} {name.split(" ")[0]} {t("work? This decides when clients can book them online.")}
        </p>
        <WorkHoursEditor
          member={{ id: created.id, work_hours: null }}
          salonHours={salonHours}
          onSaved={onClose}
        />
      </Modal>
    );
  }

  if (step === "credentials" && created) {
    return (
      <Modal
        title={t("Team member created")}
        onClose={onClose}
        footer={
          <>
            <GhostBtn onClick={onClose} className="flex-1">
              {t("Skip for now")}
            </GhostBtn>
            <PrimaryBtn
              onClick={() => setStep("schedule")}
              className="flex-[2]"
            >
              {t("Continue to schedule →")}
            </PrimaryBtn>
          </>
        }
      >
        <div className="rounded-xl bg-[#eaf5ec] px-3.5 py-3 text-[13px] text-[#4a7d57]">
          {t("They can sign in now — share these credentials with them")}
        </div>
        <div className="rounded-xl border border-line-2 bg-cream-deep p-4">
          <div className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Email (login)")}
          </div>
          <div className="mt-0.5 text-[14px] font-medium">{created.email}</div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.05em] text-muted">
            {t("Temp password")}
          </div>
          <div className="mt-0.5 font-mono text-[20px] font-medium tracking-[0.15em] text-gold-dark">
            {created.password}
          </div>
        </div>
        <GhostBtn onClick={copyCreds} className="w-full">
          {t("Copy email & password")}
        </GhostBtn>
        <div className="text-[11.5px] leading-relaxed text-muted">
          {t("They'll be asked to set their own password the first time they sign in.")}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={t("Add team member")}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Creating…") : t("Create member")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Full name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g. Camila Reyes")}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <Field label={t("Email (login)")}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="camila@solbeautylab.com"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label={t("Temp password (6 digits)")}>
            <div className="flex gap-1.5">
              <input
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                maxLength={6}
                placeholder={t("e.g. 482915")}
                className={`${inputCls} font-mono tracking-[0.15em]`}
              />
              <button
                type="button"
                onClick={() => setPassword(genTempPassword())}
                title={t("Generate")}
                className="h-11 flex-none cursor-pointer rounded-xl border border-chip-border bg-card px-3 text-[11.5px] font-medium text-gold-dark"
              >
                {t("Generate")}
              </button>
            </div>
          </Field>
        </div>
      </div>
      <Field label={t("Phone (optional)")}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 …"
          className={inputCls}
        />
      </Field>
      <Field label={t("Specialties (optional)")}>
        <SpecialtySelect
          value={specialties}
          onChange={setSpecialties}
          categories={categories}
        />
      </Field>
      <Field label={t("Role")}>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`h-10 flex-1 cursor-pointer rounded-[11px] text-[12.5px] ${
                role === r
                  ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                  : "border border-input bg-white text-[#8a8178]"
              }`}
            >
              {t(ROLE_LABEL[r])}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

/** Especialidades = categorías de servicios (se crean en Services, no aquí).
 *  Se pueden elegir varias: quien hace uñas y pestañas marca las dos. */
function SpecialtySelect({
  value,
  onChange,
  categories,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  categories: Category[];
}) {
  const { t } = useLang();

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-2 bg-card p-3 text-center text-[11.5px] text-faint">
        {t("No categories yet — add one in Services")}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = value.includes(c.name);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              onChange(
                on ? value.filter((s) => s !== c.name) : [...value, c.name]
              )
            }
            className={`h-9 cursor-pointer rounded-[20px] px-3.5 text-[12.5px] ${
              on
                ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                : "border border-input bg-white text-[#8a8178]"
            }`}
          >
            {c.icon ?? "❀"} {c.name}
          </button>
        );
      })}
    </div>
  );
}

function ManageMemberModal({
  member,
  categories,
  onClose,
}: {
  member: Profile;
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(member.full_name);
  const [specialties, setSpecialties] = useState<string[]>(
    member.specialties ?? []
  );
  const [role, setRole] = useState<Role>(member.role);
  const [active, setActive] = useState(member.is_active);
  const [modules, setModules] = useState<string[]>(
    member.role === "owner"
      ? ALL_PERMISSION_KEYS
      : member.modules ?? DEFAULT_MODULES[member.role]
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  function pickRole(r: Role) {
    setRole(r);
    setModules(r === "owner" ? ALL_PERMISSION_KEYS : DEFAULT_MODULES[r]);
  }

  function toggleModule(key: string) {
    if (key === "dashboard") return; // siempre visible
    setModules((m) =>
      m.includes(key) ? m.filter((k) => k !== key) : [...m, key]
    );
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || member.full_name,
        specialties,
        role,
        is_active: active,
        modules: role === "owner" ? null : modules,
      })
      .eq("id", member.id);
    setSaving(false);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    toast(t("Member updated"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={`${t("Manage")} · ${member.full_name.split(" ")[0]}`}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save changes")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Full name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label={t("Specialties")}>
        <SpecialtySelect
          value={specialties}
          onChange={setSpecialties}
          categories={categories}
        />
      </Field>

      <Field label={t("Role")}>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => pickRole(r)}
              className={`h-10 flex-1 cursor-pointer rounded-[11px] text-[12.5px] ${
                role === r
                  ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                  : "border border-input bg-white text-[#8a8178]"
              }`}
            >
              {t(ROLE_LABEL[r])}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("Module access")}>
        {role === "owner" ? (
          <div className="rounded-xl bg-tan p-3 text-[12px] text-body">
            {t("Owners always have access to every module.")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PERM_ITEMS.map((n) => {
              const on = modules.includes(n.key);
              const locked = n.key === "dashboard";
              return (
                <button
                  key={n.key}
                  onClick={() => toggleModule(n.key)}
                  disabled={locked}
                  className={`h-9 cursor-pointer rounded-[10px] text-[11.5px] ${
                    on
                      ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                      : "border border-input bg-white text-[#8a8178]"
                  } ${locked ? "opacity-70" : ""}`}
                >
                  {n.icon} {t(n.label)}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <div className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
        <div>
          <div className="text-[13px] font-medium">{t("Active")}</div>
          <div className="text-[11px] text-muted">
            {t("Inactive members can't be booked and lose access")}
          </div>
        </div>
        <div
          onClick={() => setActive(!active)}
          className="cursor-pointer rounded-[20px] p-[3px] transition-colors"
          style={{
            width: 44,
            height: 26,
            background: active ? "#8a6526" : "#e0d4bd",
          }}
        >
          <div
            className="h-5 w-5 rounded-full bg-white transition-transform"
            style={{ transform: active ? "translateX(18px)" : "none" }}
          />
        </div>
      </div>
    </Modal>
  );
}
