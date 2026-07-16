"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
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
    icon: "⏰",
    title: "Appointment reminder",
    desc: "Sent before each appointment (hours configurable)",
  },
  confirmation_request: {
    icon: "✓",
    title: "Confirmation request",
    desc: "One-tap confirm link so you know who's coming",
  },
  thank_you: {
    icon: "💌",
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

export function RemindersClient({
  settings,
  templates,
  recent,
}: {
  settings: ReminderSetting[];
  templates: MessageTemplate[];
  recent: RecentMsg[];
}) {
  const [local, setLocal] = useState(settings);
  const toast = useToast();

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
      toast("Update failed: " + error.message);
      setLocal((ls) =>
        ls.map((s) => (s.type === type ? { ...s, enabled: !next } : s))
      );
      return;
    }
    toast(next ? "Reminder enabled" : "Reminder disabled");
  }

  async function toggleChannel(type: ReminderType, channel: MessageChannel) {
    const cur = local.find((s) => s.type === type);
    if (!cur) return;
    const has = cur.channels.includes(channel);
    const channels = has
      ? cur.channels.filter((c) => c !== channel)
      : [...cur.channels, channel];
    setLocal((ls) => ls.map((s) => (s.type === type ? { ...s, channels } : s)));
    const supabase = createClient();
    const { error } = await supabase
      .from("reminder_settings")
      .update({ channels })
      .eq("type", type);
    if (error) toast("Update failed: " + error.message);
  }

  const waTemplate = templates.find(
    (t) => t.type === "appointment_reminder" && t.channel === "whatsapp"
  );

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
                  <div className="text-sm font-medium">{meta.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {meta.desc}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    {(["whatsapp", "sms"] as MessageChannel[]).map((ch) => {
                      const on = s.channels.includes(ch);
                      return (
                        <button
                          key={ch}
                          onClick={() => toggleChannel(s.type, ch)}
                          className={`h-7 cursor-pointer rounded-[20px] px-3 text-[11px] capitalize ${
                            on
                              ? "grad-gold-soft border border-gold font-medium text-gold-deep"
                              : "border border-input bg-white text-[#8a8178]"
                          }`}
                        >
                          {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                        </button>
                      );
                    })}
                    <span className="ml-1 text-[10.5px] text-faint">
                      {s.hours_offset}h{" "}
                      {s.type === "thank_you" ? "after" : "before"}
                    </span>
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

        <div className="rounded-2xl border border-line bg-card p-[18px]">
          <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-muted">
            Recent messages
          </div>
          {recent.length === 0 && (
            <div className="py-3 text-[12px] text-faint">
              No messages queued yet — they appear here once the cron starts
              queuing reminders.
            </div>
          )}
          {recent.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-t border-line-4 py-2.5 first:border-t-0"
            >
              <span className="text-sm">
                {m.channel === "whatsapp" ? "🟢" : "💬"}
              </span>
              <div className="flex-1">
                <div className="text-[12px] font-medium">
                  {TYPE_META[m.type]?.title ?? m.type}
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
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-line bg-card p-[22px]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.06em] text-muted">
          Preview · WhatsApp reminder
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
            <div className="rounded-xl bg-cream-deep p-3.5 text-[12.5px] leading-relaxed text-warm">
              {(waTemplate?.body ?? "")
                .replace("{{client_name}}", "Priya")
                .replace("{{service}}", "Volume lashes")
                .replace("{{staff}}", "Sol")
                .replace("{{date}}", "14 Jul")
                .replace("{{time}}", "1:30 PM")
                .replace("{{confirm_url}}", "sol.link/c/x1y2")}
            </div>
            <div className="mt-3 text-center text-[11px] text-faint">
              Sent automatically via Twilio / WhatsApp Cloud API
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-tan p-3.5 text-[11.5px] leading-relaxed text-body">
          <b>Setup pendiente:</b> los toggles ya guardan en la base de datos.
          Para el envío real falta desplegar la Edge Function con las
          credenciales de Twilio / Meta y activar pg_cron — pídemelo cuando
          quieras conectarlo.
        </div>
      </div>
    </div>
  );
}
