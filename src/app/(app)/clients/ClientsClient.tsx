"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Modal,
  ModalShell,
  Field,
  inputCls,
  PrimaryBtn,
  GhostBtn,
} from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { NewApptButton } from "@/components/NewApptButton";
import {
  avatarFor,
  fmtDate,
  fmtDateShort,
  fmtMoney,
  initialsOf,
} from "@/lib/format";
import { ConsentSummary } from "@/components/ConsentForm";
import type {
  Client,
  ClientConsent,
  ClientStats,
  Profile,
  Service,
} from "@/lib/types";

interface Visit {
  id: string;
  starts_at: string;
  price: number;
  services: { name: string } | null;
  profiles: { full_name: string } | null;
}

/** Historial de visitas: la dueña pagina de 10; el staff solo ve las 2 últimas */
const HISTORY_PAGE = 10;
const STAFF_HISTORY = 2;

export function ClientsClient({
  me,
  clients,
  stats,
  services,
  staff,
}: {
  me: Profile;
  clients: Client[];
  stats: ClientStats[];
  services: Pick<Service, "id" | "name" | "price" | "duration_min">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
}) {
  const [query, setQuery] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(0);
  const { t } = useLang();

  const statMap = useMemo(
    () => new Map(stats.map((s) => [s.client_id, s])),
    [stats]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const qDigits = q.replace(/\D/g, "");
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (qDigits && c.phone.replace(/\D/g, "").includes(qDigits))
    );
  }, [clients, query]);

  const sel = selId ? clients.find((c) => c.id === selId) ?? null : null;
  const canAdd = true; // owner, recepción y staff pueden crear clientas
  const showMoney = me.role === "owner";
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex h-10 w-[230px] max-w-full items-center gap-1.5 rounded-[20px] border border-[#ece2d0] bg-card pl-3.5 pr-1.5">
            <span className="text-[13px] text-sand">⌕</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t("Search clients, phone…")}
              className="flex-1 border-none bg-transparent text-[12.5px] text-ink outline-none"
            />
          </div>
          <div className="text-[12.5px] text-muted">
            {filtered.length}{" "}
            {filtered.length === 1 ? t("client") : t("clients")}
            {query ? ` ${t("matching")} "${query}"` : ""}
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => setAdding(true)}
            className="h-9 cursor-pointer rounded-[20px] border border-chip-border bg-card px-4 text-[12.5px] font-medium text-gold-dark"
          >
            {t("+ Add client")}
          </button>
        )}
      </div>

      <div className="stagger grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {pageItems.map((c) => {
          const st = statMap.get(c.id);
          return (
            <div
              key={c.id}
              onClick={() => setSelId(c.id)}
              className="cursor-pointer rounded-2xl border border-line bg-card p-4 transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(90,60,10,.5)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-medium text-white"
                  style={{ background: avatarFor(c.id) }}
                >
                  {initialsOf(c.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {c.full_name}
                  </div>
                  <div className="text-[11.5px] text-muted">{c.phone}</div>
                </div>
                {st?.is_new && (
                  <span className="rounded-[20px] bg-[#eaf5ec] px-2 py-[3px] text-[9px] tracking-[0.08em] text-[#5a9f6a]">
                    NEW
                  </span>
                )}
              </div>
              <div className="mt-3.5 flex gap-4 border-t border-line-3 pt-3">
                <div>
                  <div className="font-serif text-[15px] font-semibold">
                    {st?.visits ?? 0}
                  </div>
                  <div className="text-[10px] text-muted">{t("visits")}</div>
                </div>
                {showMoney && (
                  <div>
                    <div className="font-serif text-[15px] font-semibold">
                      {fmtMoney(Number(st?.total_spent ?? 0))}
                    </div>
                    <div className="text-[10px] text-muted">
                      {t("lifetime")}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="mt-0.5 text-[11px] text-muted">
                    {t("Last ·")}{" "}
                    {st?.last_visit ? fmtDateShort(st.last_visit) : "—"}
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] text-[#b0863c]">
                    {st?.favorite_service ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-[13px] text-faint">
            {t("No clients yet")}
          </div>
        )}
      </div>
      <Pagination page={page} total={filtered.length} onChange={setPage} />

      {sel && (
        <ClientDrawer
          client={sel}
          stats={statMap.get(sel.id)}
          me={me}
          services={services}
          staff={staff}
          onClose={() => setSelId(null)}
        />
      )}
      {adding && <AddClientModal me={me} onClose={() => setAdding(false)} />}
    </>
  );
}

function ClientDrawer({
  client,
  stats,
  me,
  services,
  staff,
  onClose,
}: {
  client: Client;
  stats?: ClientStats;
  me: Profile;
  services: Pick<Service, "id" | "name" | "price" | "duration_min">[];
  staff: Pick<Profile, "id" | "full_name" | "role">[];
  onClose: () => void;
}) {
  const [history, setHistory] = useState<Visit[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const { t } = useLang();
  const canEdit = true; // owner, recepción y staff pueden editar clientas
  // La dueña ve el historial completo paginado; el resto del equipo solo
  // las 2 visitas más recientes (RLS ya limita las suyas).
  const isOwner = me.role === "owner";
  const histPerPage = isOwner ? HISTORY_PAGE : STAFF_HISTORY;

  useEffect(() => setHistPage(0), [client.id]);

  useEffect(() => {
    const supabase = createClient();
    const from = isOwner ? histPage * HISTORY_PAGE : 0;
    supabase
      .from("appointments")
      .select(
        "id, starts_at, price, services(name), profiles!staff_id(full_name)",
        { count: "exact" }
      )
      .eq("client_id", client.id)
      .order("starts_at", { ascending: false })
      .range(from, from + histPerPage - 1)
      .then(({ data, count }) => {
        setHistory((data ?? []) as unknown as Visit[]);
        setHistTotal(count ?? 0);
      });
  }, [client.id, histPage, isOwner, histPerPage]);

  return (
    <ModalShell onClose={onClose} width={440} align="right">
        <div className="grad-dark relative px-6 py-[26px] text-[#f0e9dc]">
          <div className="absolute right-[18px] top-[18px] flex gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                title={t("Edit client")}
                className="h-[30px] w-[30px] cursor-pointer rounded-full border-none text-[13px] text-[#f0e9dc]"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                ✎
              </button>
            )}
            <button
              onClick={onClose}
              className="h-[30px] w-[30px] cursor-pointer rounded-full border-none text-[15px] text-[#f0e9dc]"
              style={{ background: "rgba(255,255,255,.12)" }}
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[22px] font-semibold text-espresso"
              style={{ background: "linear-gradient(135deg,#e4c97e,#8a6526)" }}
            >
              {initialsOf(client.full_name)}
            </div>
            <div>
              <div className="font-serif text-[26px] font-semibold">
                {client.full_name}
              </div>
              <div className="text-[12.5px] text-[#c4b9a6]">
                {client.phone}
                {client.email ? ` · ${client.email}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-[18px] flex gap-5">
            {[
              [String(stats?.visits ?? 0), t("visits")],
              ...(me.role === "owner"
                ? [[fmtMoney(Number(stats?.total_spent ?? 0)), t("lifetime")]]
                : []),
              [
                stats?.last_visit ? fmtDateShort(stats.last_visit) : "—",
                t("Last ·").replace(" ·", ""),
              ],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-serif text-[22px] font-semibold text-gold-light">
                  {v}
                </div>
                <div className="text-[10px] text-[#c4b9a6]">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-[22px]">
          <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Preferences & notes")}
          </div>
          <div className="rounded-[14px] border border-line bg-card p-3.5 text-[13px] leading-relaxed text-warm">
            {client.notes || t("No notes yet.")}
          </div>
          {client.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {client.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-[20px] bg-gold-pale px-3 py-1 text-[11px] text-gold-dark"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <ClientGallery clientId={client.id} />

          <ClientConsentsSection clientId={client.id} />

          <div className="mb-2 mt-[22px] flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.06em] text-muted">
              {t("Visit history")}
            </span>
            {!isOwner && histTotal > STAFF_HISTORY && (
              <span className="text-[10.5px] text-faint">
                {t("Latest 2 of")} {histTotal}
              </span>
            )}
          </div>
          {history.length === 0 && (
            <div className="py-4 text-[12px] text-faint">
              {t("No visits yet")}
            </div>
          )}
          {history.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3.5 border-b border-line py-3"
            >
              <div className="grad-bar h-[34px] w-[5px] rounded-[3px]" style={{ background: "linear-gradient(180deg,#c9a24b,#8a6526)" }} />
              <div className="flex-1">
                <div className="text-[13px] font-medium">
                  {v.services?.name ?? "Service"}
                </div>
                <div className="text-[11px] text-muted">
                  {fmtDateShort(v.starts_at)} ·{" "}
                  {v.profiles?.full_name?.split(" ")[0]}
                </div>
              </div>
              <div className="font-serif text-sm font-semibold">
                {fmtMoney(Number(v.price))}
              </div>
            </div>
          ))}

          {isOwner && (
            <Pagination
              page={histPage}
              total={histTotal}
              perPage={HISTORY_PAGE}
              onChange={setHistPage}
            />
          )}

          <NewApptButton
            clients={[{ id: client.id, full_name: client.full_name }]}
            services={services}
            staff={staff}
            me={me}
            defaultClientId={client.id}
            label={t("Book appointment")}
            variant="wide"
          />
        </div>
        {editing && (
          <EditClientModal client={client} onClose={() => setEditing(false)} />
        )}
    </ModalShell>
  );
}

function OptToggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border text-[11.5px] ${
        on
          ? "grad-gold-soft border-gold font-medium text-gold-deep"
          : "border-input bg-white text-[#8a8178]"
      }`}
    >
      {on ? "✓" : "○"} {label}
    </button>
  );
}

function EditClientModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const [name, setName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [tags, setTags] = useState(client.tags.join(", "));
  const [sms, setSms] = useState(client.sms_opt_in);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim() || !phone.trim()) {
      toast(t("Full name") + " & " + t("Phone"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({
        full_name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        tags: tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        sms_opt_in: sms,
      })
      .eq("id", client.id);
    setSaving(false);
    if (error) {
      toast("Error: " + error.message);
      return;
    }
    toast(t("Client updated"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Edit client")}
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
      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <Field label={t("Phone")}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label={t("Email (optional)")}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <Field label={t("Notes (optional)")}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("Preferences, allergies…")}
          className="w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-ink outline-none"
        />
      </Field>
      <Field label={t("Tags (comma separated)")}>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="VIP, Lashes, Sensitive"
          className={inputCls}
        />
      </Field>
      <div className="flex gap-2">
        <OptToggle
          label={t("SMS reminders")}
          on={sms}
          onToggle={() => setSms((v) => !v)}
        />
      </div>
    </Modal>
  );
}

const BUCKET = "client-photos";

interface Photo {
  name: string;
  url: string;
}

/** Fichas de consentimiento firmadas de la clienta, con detalle y firma */
function ClientConsentsSection({ clientId }: { clientId: string }) {
  const [consents, setConsents] = useState<ClientConsent[]>([]);
  const [sel, setSel] = useState<ClientConsent | null>(null);
  const { t } = useLang();

  useEffect(() => {
    setSel(null);
    createClient()
      .from("client_consents")
      .select("*")
      .eq("client_id", clientId)
      .order("signed_at", { ascending: false })
      .then(({ data, error }) =>
        // Si la migración 025 no ha corrido, la sección simplemente no sale
        setConsents(error ? [] : ((data as ClientConsent[]) ?? []))
      );
  }, [clientId]);

  if (consents.length === 0) return null;

  return (
    <>
      <div className="mb-2 mt-[22px] text-[11px] uppercase tracking-[0.06em] text-muted">
        {t("Signed consent forms")}
      </div>
      <div className="flex flex-col gap-1.5">
        {consents.map((c) => (
          <button
            key={c.id}
            onClick={() => setSel(c)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-line bg-card px-3 py-2 text-left text-[12.5px] hover:border-chip-border"
          >
            <span className="truncate">
              ✓ {c.service_label || t("Consent form")}
            </span>
            <span className="flex-none text-[11px] text-muted">
              {fmtDate(c.signed_at)}
            </span>
          </button>
        ))}
      </div>
      {sel && (
        <ModalShell onClose={() => setSel(null)} width={480}>
          <div className="p-6">
            <ConsentSummary consent={sel} />
            <button
              onClick={() => setSel(null)}
              className="mt-4 h-[42px] w-full cursor-pointer rounded-xl border border-[#ece2d0] bg-white text-[13px] text-[#8a8178]"
            >
              {t("Close")}
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function ClientGallery({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { t } = useLang();

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(clientId, { sortBy: { column: "created_at", order: "desc" } });
    setPhotos(
      (data ?? [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => ({
          name: f.name,
          url: supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${clientId}/${f.name}`).data.publicUrl,
        }))
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${clientId}/${Date.now()}-${safe}`, file, {
          cacheControl: "3600",
        });
      if (error) toast(t("Upload failed:") + " " + error.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    toast(t("Photo added ✓"));
    load();
  }

  async function remove(photo: Photo) {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${clientId}/${photo.name}`]);
    if (error) {
      toast(t("Delete failed:") + " " + error.message);
      return;
    }
    setLightbox(null);
    setConfirmDel(false);
    setPhotos((p) => p.filter((x) => x.name !== photo.name));
    toast(t("Photo removed"));
  }

  return (
    <>
      <div className="mb-2 mt-[22px] flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.06em] text-muted">
          {t("Gallery")}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-7 cursor-pointer rounded-[20px] border border-chip-border bg-card px-3 text-[11px] font-medium text-gold-dark disabled:opacity-60"
        >
          {uploading ? (
            <>
              <span className="spinner spinner-gold mr-1.5" />
              {t("Uploading…")}
            </>
          ) : (
            t("+ Add photo")
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {photos.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-2 bg-card p-4 text-center text-[11.5px] text-faint">
          {t("No photos yet — save their best looks here")}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={p.name}
              src={p.url}
              alt="Client work"
              onClick={() => setLightbox(p)}
              className="anim-fade aspect-square w-full cursor-pointer rounded-xl border border-line object-cover transition-transform hover:scale-[1.03]"
            />
          ))}
        </div>
      )}

      {lightbox && (
        <ModalShell
          onClose={() => {
            setLightbox(null);
            setConfirmDel(false);
          }}
          width={720}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt="Client work"
            className="max-h-[70vh] w-full bg-espresso object-contain"
          />
          <div className="flex flex-none items-center justify-between px-5 py-3">
            <button
              onClick={() =>
                confirmDel ? remove(lightbox) : setConfirmDel(true)
              }
              className={`h-9 cursor-pointer rounded-[10px] border px-3.5 text-[12px] font-medium ${
                confirmDel
                  ? "border-[#b06a6a] bg-[#b06a6a] text-white"
                  : "border-[#e9d6d6] bg-[#fbf3f3] text-[#b06a6a]"
              }`}
            >
              {confirmDel ? t("Tap again to delete") : t("Delete photo")}
            </button>
            <button
              onClick={() => {
                setLightbox(null);
                setConfirmDel(false);
              }}
              className="h-9 cursor-pointer rounded-[10px] border border-[#ece2d0] bg-white px-3.5 text-[12px] text-[#8a8178]"
            >
              {t("Close")}
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function AddClientModal({ me, onClose }: { me: Profile; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim() || !phone.trim()) {
      toast(t("Full name") + " & " + t("Phone"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("clients").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      created_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast("Could not save: " + error.message);
      return;
    }
    toast(t("Client added"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Add client")}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save client")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Full name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maya Ortiz"
          className={inputCls}
        />
      </Field>
      <Field label={t("Phone")}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (305) 555-0123"
          className={inputCls}
        />
      </Field>
      <Field label={t("Email (optional)")}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="client@email.com"
          className={inputCls}
        />
      </Field>
      <Field label={t("Notes (optional)")}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("Preferences, allergies…")}
          rows={3}
          className="w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold"
        />
      </Field>
      <Field label={t("Tags (comma separated)")}>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="VIP, Lashes, Sensitive"
          className={inputCls}
        />
      </Field>
    </Modal>
  );
}
