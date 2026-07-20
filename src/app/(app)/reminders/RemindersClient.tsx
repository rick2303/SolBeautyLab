"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { fmtDate, fmtTime } from "@/lib/format";
import type {
  MessageChannel,
  MessageTemplate,
  ReminderSetting,
  ReminderType,
} from "@/lib/types";

const TYPE_META: Record<
  ReminderType,
  { icon: string; title: string; desc: string }
> = {
  appointment_reminder: {
    icon: "◷",
    title: "Appointment reminder",
    desc: "Sent before each appointment (hours configurable)",
  },
  confirmation_request: {
    icon: "✓",
    title: "Confirmation request",
    desc: "One-tap confirm link so you know who's coming",
  },
  thank_you: {
    icon: "❦",
    title: "Thank-you follow-up",
    desc: "Sent after each visit with a rebooking link",
  },
};

interface RecentMsg {
  id: string;
  type: ReminderType;
  channel: MessageChannel;
  to_phone: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
}

/** Reemplaza las variables con datos de ejemplo para la vista previa */
function renderSample(body: string): string {
  return body
    .replace(/\{\{client_name\}\}/g, "Priya")
    .replace(/\{\{service\}\}/g, "Volume lashes")
    .replace(/\{\{staff\}\}/g, "Sol")
    .replace(/\{\{date\}\}/g, "14 Jul")
    .replace(/\{\{time\}\}/g, "1:30 PM")
    .replace(/\{\{confirm_url\}\}/g, "solbeautylab.cc/c/x1y2");
}

type PreviewKey = ReminderType | "staff";

const PREVIEW_TABS: { key: PreviewKey; label: string }[] = [
  { key: "appointment_reminder", label: "Reminder" },
  { key: "confirmation_request", label: "Confirmation" },
  { key: "thank_you", label: "Thank-you" },
  { key: "staff", label: "Staff" },
];

export function RemindersClient({
  settings,
  templates,
  recent,
  staffTemplate,
}: {
  settings: ReminderSetting[];
  templates: MessageTemplate[];
  recent: RecentMsg[];
  staffTemplate: string;
}) {
  const [local, setLocal] = useState(settings);
  const [offsets, setOffsets] = useState<Record<string, string>>({});
  const [editingTpl, setEditingTpl] = useState<ReminderType | null>(null);
  const [editingStaffTpl, setEditingStaffTpl] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewKey>(
    "appointment_reminder"
  );
  const toast = useToast();
  const { t } = useLang();

  async function toggle(type: ReminderType) {
    const cur = local.find((s) => s.type === type);
    if (!cur) return;
    const next = !cur.enabled;
    setLocal((ls) =>
      ls.map((s) => (s.type === type ? { ...s, enabled: next } : s))
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("reminder_settings")
      .update({ enabled: next })
      .eq("type", type);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      setLocal((ls) =>
        ls.map((s) => (s.type === type ? { ...s, enabled: !next } : s))
      );
      return;
    }
    toast(next ? t("Reminder enabled") : t("Reminder disabled"));
  }

  // Guarda el nuevo offset al salir del campo (si cambió y es válido)
  async function saveOffset(type: ReminderType) {
    const raw = offsets[type];
    if (raw === undefined) return;
    const cur = local.find((s) => s.type === type);
    const n = parseInt(raw);
    setOffsets((o) => {
      const next = { ...o };
      delete next[type];
      return next;
    });
    if (!cur || isNaN(n) || n < 1 || n > 720 || n === cur.hours_offset) return;
    setLocal((ls) =>
      ls.map((s) => (s.type === type ? { ...s, hours_offset: n } : s))
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("reminder_settings")
      .update({ hours_offset: n })
      .eq("type", type);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      setLocal((ls) =>
        ls.map((s) =>
          s.type === type ? { ...s, hours_offset: cur.hours_offset } : s
        )
      );
      return;
    }
    toast(t("Timing updated"));
  }

  const previewBody =
    previewType === "staff"
      ? staffTemplate
      : templates.find((x) => x.type === previewType && x.channel === "sms")
          ?.body ?? "";

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
      <div className="flex flex-col gap-3.5">
        {local.map((s) => {
          const meta = TYPE_META[s.type];
          return (
            <div
              key={s.type}
              className="rounded-2xl border border-line bg-card p-[18px]"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-pale text-lg">
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t(meta.title)}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {t(meta.desc)}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-[20px] bg-gold-pale px-3 py-1 text-[11px] font-medium text-gold-deep">
                      SMS
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <input
                        type="number"
                        min={1}
                        max={720}
                        value={offsets[s.type] ?? String(s.hours_offset)}
                        onChange={(e) =>
                          setOffsets((o) => ({
                            ...o,
                            [s.type]: e.target.value,
                          }))
                        }
                        onBlur={() => saveOffset(s.type)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.target as HTMLInputElement).blur()
                        }
                        className="h-7 w-[52px] rounded-lg border border-input bg-white text-center text-[12px] outline-none"
                      />
                      h {s.type === "thank_you" ? t("after") : t("before")}
                    </span>
                    <button
                      onClick={() => setEditingTpl(s.type)}
                      className="h-7 cursor-pointer rounded-[20px] border border-chip-border bg-card px-3 text-[11px] font-medium text-gold-dark"
                    >
                      ✎ {t("Edit message")}
                    </button>
                  </div>
                </div>
                <div
                  onClick={() => toggle(s.type)}
                  className="cursor-pointer rounded-[20px] p-[3px] transition-colors"
                  style={{
                    width: 44,
                    height: 26,
                    background: s.enabled ? "#8a6526" : "#e0d4bd",
                  }}
                >
                  <div
                    className="h-5 w-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: s.enabled ? "translateX(18px)" : "none",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Mensaje genérico al staff cuando les agendan una cita */}
        <div className="rounded-2xl border border-line bg-card p-[18px]">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-pale text-lg">
              ✆
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {t("New booking (staff)")}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                {t("Sent to the assigned technician when a client books")}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="rounded-[20px] bg-gold-pale px-3 py-1 text-[11px] font-medium text-gold-deep">
                  SMS
                </span>
                <span className="rounded-[20px] bg-gold-pale px-3 py-1 text-[11px] font-medium text-gold-deep">
                  Push
                </span>
                <span className="ml-1 text-[10.5px] text-faint">
                  {t("Sent instantly at booking")}
                </span>
                <button
                  onClick={() => setEditingStaffTpl(true)}
                  className="h-7 cursor-pointer rounded-[20px] border border-chip-border bg-card px-3 text-[11px] font-medium text-gold-dark"
                >
                  ✎ {t("Edit message")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-[18px]">
          <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Recent messages")}
          </div>
          {recent.length === 0 && (
            <div className="py-3 text-[12px] text-faint">
              {t(
                "No messages queued yet — they appear here once the cron starts queuing reminders."
              )}
            </div>
          )}
          {recent.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-t border-line-4 py-2.5 first:border-t-0"
            >
              <span className="text-sm">✉︎</span>
              <div className="flex-1">
                <div className="text-[12px] font-medium">
                  {t(TYPE_META[m.type]?.title ?? m.type)}
                </div>
                <div className="text-[10.5px] text-muted">
                  {m.to_phone} · {fmtDate(m.scheduled_at)}{" "}
                  {fmtTime(m.scheduled_at)}
                </div>
              </div>
              <span
                className={`rounded-[20px] px-2 py-0.5 text-[10px] capitalize ${
                  m.status === "sent" || m.status === "delivered"
                    ? "bg-[#eaf5ec] text-[#4a7d57]"
                    : m.status === "failed"
                    ? "bg-[#f6e9e9] text-[#a05a5a]"
                    : "bg-tan text-[#8a8178]"
                }`}
              >
                {t(m.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-line bg-card p-[22px]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.06em] text-muted">
          {t("Preview · SMS")}
        </div>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {PREVIEW_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreviewType(key)}
              className={`h-8 cursor-pointer rounded-[20px] px-3.5 text-[11.5px] ${
                previewType === key
                  ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                  : "border border-input bg-white text-[#8a8178]"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-[14px] border border-line-2">
          <div className="grad-dark py-[22px] text-center">
            <div
              className="text-gold-grad-dark font-serif font-bold"
              style={{ fontSize: 30, letterSpacing: "0.05em" }}
            >
              SŌL
            </div>
            <div className="mt-1 text-[8px] tracking-[0.5em] text-[#8f8371]">
              BEAUTY LAB
            </div>
          </div>
          <div className="px-5 py-[22px]">
            {previewBody ? (
              <div className="rounded-xl bg-cream-deep p-3.5 text-[12.5px] leading-relaxed text-warm">
                {renderSample(previewBody)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line-2 p-3.5 text-center text-[11.5px] text-faint">
                {t("No SMS template yet — tap “Edit message”")}
              </div>
            )}
            <div className="mt-3 text-center text-[11px] text-faint">
              {t("Sent automatically via Twilio SMS")}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-tan p-3.5 text-[11.5px] leading-relaxed text-body">
          <b>{t("Setup pending:")}</b>{" "}
          {t(
            "Toggles and messages already save. Real sending needs Twilio credentials and the cron — ask me when you want to connect it."
          )}
        </div>
      </div>

      {editingTpl && (
        <EditTemplateModal
          type={editingTpl}
          templates={templates}
          onClose={() => setEditingTpl(null)}
        />
      )}
      {editingStaffTpl && (
        <EditStaffTemplateModal
          body={staffTemplate}
          onClose={() => setEditingStaffTpl(false)}
        />
      )}
    </div>
  );
}

const TEMPLATE_VARS = [
  "{{client_name}}",
  "{{service}}",
  "{{staff}}",
  "{{date}}",
  "{{time}}",
  "{{confirm_url}}",
];

function EditTemplateModal({
  type,
  templates,
  onClose,
}: {
  type: ReminderType;
  templates: MessageTemplate[];
  onClose: () => void;
}) {
  const tpl = templates.find((x) => x.type === type && x.channel === "sms");
  const [body, setBody] = useState(tpl?.body ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!body.trim()) {
      toast(t("Enter the message"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // Upsert: crea la plantilla SMS si ese tipo aún no la tiene
    const { error } = await supabase
      .from("message_templates")
      .upsert(
        {
          type,
          channel: "sms",
          language: tpl?.language ?? "es",
          body: body.trim(),
        },
        { onConflict: "type,channel,language" }
      );
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Message saved"));
    router.refresh();
    onClose();
  }

  return (
    <Modal
      title={t(TYPE_META[type].title)}
      onClose={onClose}
      width={480}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save message")}
          </PrimaryBtn>
        </>
      }
    >
      <TemplateFields body={body} setBody={setBody} vars={TEMPLATE_VARS} />
    </Modal>
  );
}

/** Mensaje genérico al staff — vive en salon_settings (fila única) */
function EditStaffTemplateModal({
  body: initial,
  onClose,
}: {
  body: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!body.trim()) {
      toast(t("Enter the message"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("salon_settings")
      .update({ staff_booking_template: body.trim() })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Message saved"));
    router.refresh();
    onClose();
  }

  return (
    <Modal
      title={t("New booking (staff)")}
      onClose={onClose}
      width={480}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save message")}
          </PrimaryBtn>
        </>
      }
    >
      <TemplateFields body={body} setBody={setBody} vars={STAFF_VARS} />
    </Modal>
  );
}

const STAFF_VARS = [
  "{{staff}}",
  "{{client_name}}",
  "{{service}}",
  "{{date}}",
  "{{time}}",
];

function TemplateFields({
  body,
  setBody,
  vars,
}: {
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  vars: string[];
}) {
  const { t } = useLang();
  return (
    <>
      <div>
        <label className="text-[11px] uppercase tracking-[0.05em] text-muted">
          {t("Message (SMS)")}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="mt-1.5 w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-ink outline-none"
        />
        <div className="mt-1 text-right text-[10.5px] text-faint">
          {body.length} {t("characters")}
        </div>
      </div>
      <div className="rounded-xl bg-tan p-3">
        <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.05em] text-muted">
          {t("Available variables — tap to insert")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {vars.map((v) => (
            <button
              key={v}
              onClick={() =>
                setBody((b) => b + (b.endsWith(" ") || !b ? "" : " ") + v)
              }
              className="h-7 cursor-pointer rounded-[16px] border border-chip-border bg-card px-2.5 font-mono text-[10.5px] text-gold-dark"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
