"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ModalShell } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
import { fmtDate, fmtTime } from "@/lib/format";
import type { AppointmentFull } from "@/lib/types";

const BUCKET = "inspo-photos";
const MAX_PHOTOS = 5;

interface Photo {
  name: string;
  url: string;
}

export function InspoBoardModal({
  appt,
  onClose,
}: {
  appt: AppointmentFull;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { t } = useLang();

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(appt.id, { sortBy: { column: "created_at", order: "desc" } });
    const files = (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    if (files.length === 0) {
      setPhotos([]);
      return;
    }
    // Bucket privado: URLs firmadas (1h), no públicas
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(files.map((f) => `${appt.id}/${f.name}`), 3600);
    setPhotos(
      files.map((f, i) => ({
        name: f.name,
        url: signed?.[i]?.signedUrl ?? "",
      }))
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.id]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast(t("Max 5 photos per appointment"));
      return;
    }
    const batch = Array.from(files).slice(0, remaining);
    if (files.length > remaining) toast(t("Max 5 photos per appointment"));
    setUploading(true);
    const supabase = createClient();
    for (const file of batch) {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${appt.id}/${Date.now()}-${safe}`, file, {
          cacheControl: "3600",
        });
      if (error) toast("Upload failed: " + error.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    toast("Photo added ✨");
    load();
  }

  async function remove(photo: Photo) {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${appt.id}/${photo.name}`]);
    if (error) {
      toast("Delete failed: " + error.message);
      return;
    }
    setLightbox(null);
    setPhotos((p) => p.filter((x) => x.name !== photo.name));
    toast("Photo removed");
  }

  const full = photos.length >= MAX_PHOTOS;

  return (
    <ModalShell onClose={onClose} width={520}>
      <div className="flex flex-none items-start justify-between border-b border-line-2 px-6 py-4 sm:py-5">
        <div>
          <div className="font-serif text-[22px] font-semibold">
            {appt.clients?.full_name ?? "Client"}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            {appt.services?.name} · {appt.profiles?.full_name?.split(" ")[0]}
          </div>
          <div className="text-[12px] text-muted">
            {fmtDate(appt.starts_at)} · {fmtTime(appt.starts_at)}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-[30px] w-[30px] cursor-pointer rounded-full bg-tan text-sm text-[#8a8178] hover:bg-line"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted">
            {t("Inspiration board")} · {photos.length}/{MAX_PHOTOS} {t("photos")}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || full}
            title={full ? t("Max 5 photos per appointment") : undefined}
            className="h-7 cursor-pointer rounded-[20px] border border-chip-border bg-card px-3 text-[11px] font-medium text-gold-dark disabled:cursor-default disabled:opacity-60"
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
          <div className="rounded-[14px] border border-dashed border-line-2 bg-card p-6 text-center text-[11.5px] text-faint">
            {t("No inspiration yet — add ideas for this appointment")}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={p.name}
                src={p.url}
                alt="Inspiration"
                onClick={() => setLightbox(p)}
                className="anim-fade aspect-square w-full cursor-pointer rounded-xl border border-line object-cover transition-transform hover:scale-[1.03]"
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <ModalShell onClose={() => setLightbox(null)} width={720}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt="Inspiration"
            className="max-h-[70vh] w-full bg-espresso object-contain"
          />
          <div className="flex flex-none items-center justify-between px-5 py-3">
            <button
              onClick={() => remove(lightbox)}
              className="h-9 cursor-pointer rounded-[10px] border border-[#e9d6d6] bg-[#fbf3f3] px-3.5 text-[12px] font-medium text-[#b06a6a]"
            >
              {t("Delete photo")}
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="h-9 cursor-pointer rounded-[10px] border border-[#ece2d0] bg-white px-3.5 text-[12px] text-[#8a8178]"
            >
              {t("Close")}
            </button>
          </div>
        </ModalShell>
      )}
    </ModalShell>
  );
}
