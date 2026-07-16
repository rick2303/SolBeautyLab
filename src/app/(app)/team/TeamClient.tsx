"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
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
import type { Profile, Role } from "@/lib/types";
import { createTeamMember } from "./actions";

interface Row {
  member: Profile;
  todayCount: number;
  servicesCount: number;
  revenue: number;
}

export function TeamClient({ me, rows }: { me: Profile; rows: Row[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  return (
    <>
      <div className="mb-3.5 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="grad-gold h-9 cursor-pointer rounded-[20px] border-none px-4 text-[12.5px] font-medium text-white"
        >
          + Add team member
        </button>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map(({ member: t, todayCount, servicesCount, revenue }) => (
          <div
            key={t.id}
            className={`rounded-2xl border border-line bg-card p-[18px] ${
              !t.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-lg font-medium text-white"
                style={{ background: avatarFor(t.id) }}
              >
                {initialsOf(t.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[15.5px] font-medium">
                  <span className="truncate">{t.full_name}</span>
                  {!t.is_active && (
                    <span className="rounded-[20px] bg-tan px-2 py-0.5 text-[9px] tracking-[0.08em] text-[#8a8178]">
                      INACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-muted">
                  {t.specialty ? `${t.specialty} · ` : ""}
                  {ROLE_LABEL[t.role]}
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-[22px] font-semibold">
                  {todayCount}
                </div>
                <div className="text-[10px] text-muted">today</div>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-3.5 border-t border-line-3 pt-3.5">
              <div className="flex-1">
                <div className="text-[11px] text-muted">Services this month</div>
                <div className="font-serif text-base font-semibold">
                  {servicesCount}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-muted">Revenue</div>
                <div className="font-serif text-base font-semibold">
                  {fmtMoney(revenue)}
                </div>
              </div>
              {t.id !== me.id && (
                <button
                  onClick={() => setEditing(t)}
                  className="h-8 cursor-pointer rounded-lg border border-[#ece2d0] bg-white px-3 text-xs text-gold-dark"
                >
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && <AddMemberModal onClose={() => setAdding(false)} />}
      {editing && (
        <ManageMemberModal member={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

const ROLES: Role[] = ["staff", "receptionist", "owner"];

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast("Name, email & password (6+ chars) required");
      return;
    }
    setSaving(true);
    const res = await createTeamMember({
      full_name: name,
      email,
      password,
      role,
      specialty,
      phone,
    });
    setSaving(false);
    if (res.error) {
      toast(res.error);
      return;
    }
    toast("Team member created — they can sign in now");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title="Add team member"
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? "Creating…" : "Create member"}
          </PrimaryBtn>
        </>
      }
    >
      <Field label="Full name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Camila Reyes"
          className={inputCls}
        />
      </Field>
      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <Field label="Email (login)">
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
          <Field label="Temp password">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 characters"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <Field label="Phone (optional)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 …"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Specialty (optional)">
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Nails, Lashes…"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <Field label="Role">
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
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function ManageMemberModal({
  member,
  onClose,
}: {
  member: Profile;
  onClose: () => void;
}) {
  const [name, setName] = useState(member.full_name);
  const [specialty, setSpecialty] = useState(member.specialty ?? "");
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
        specialty: specialty.trim() || null,
        role,
        is_active: active,
        modules: role === "owner" ? null : modules,
      })
      .eq("id", member.id);
    setSaving(false);
    if (error) {
      toast("Update failed: " + error.message);
      return;
    }
    toast("Member updated");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={`Manage · ${member.full_name.split(" ")[0]}`}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? "Saving…" : "Save changes"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <Field label="Full name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Specialty">
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Nails, Lashes…"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <Field label="Role">
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
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Module access">
        {role === "owner" ? (
          <div className="rounded-xl bg-tan p-3 text-[12px] text-body">
            Owners always have access to every module.
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
                  {n.icon} {n.label}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <div className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
        <div>
          <div className="text-[13px] font-medium">Active</div>
          <div className="text-[11px] text-muted">
            Inactive members can&apos;t be booked and lose access
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
