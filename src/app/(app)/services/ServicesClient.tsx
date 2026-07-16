"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { fmtMoney } from "@/lib/format";
import type { Profile, Service, ServiceCategory } from "@/lib/types";

export function ServicesClient({
  me,
  categories,
  services,
}: {
  me: Profile;
  categories: ServiceCategory[];
  services: Service[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ price: "", duration: "" });
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const isOwner = me.role === "owner";

  async function saveEdit(id: string) {
    const price = parseFloat(draft.price) || 0;
    const duration_min = parseInt(draft.duration) || 0;
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .update({ price, duration_min })
      .eq("id", id);
    if (error) {
      toast("Update failed: " + error.message);
      return;
    }
    setEditingId(null);
    toast("Service updated");
    router.refresh();
  }

  return (
    <>
      {isOwner && (
        <div className="mb-3.5 flex justify-end">
          <button
            onClick={() => setAdding(true)}
            className="h-9 cursor-pointer rounded-[20px] border border-chip-border bg-card px-4 text-[12.5px] font-medium text-gold-dark"
          >
            + Add service
          </button>
        </div>
      )}

      {categories.map((cat) => {
        const items = services.filter((s) => s.category_id === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id} className="mb-[18px]">
            <div className="mb-2 font-serif text-lg font-semibold text-gold-dark">
              {cat.name}
            </div>
            <div className="overflow-hidden rounded-[14px] border border-line bg-card">
              {items.map((s) => {
                const editing = editingId === s.id;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3.5 border-t border-line-4 px-[18px] py-[13px] first:border-t-0"
                  >
                    <div className="flex-1 text-[13.5px] font-medium">
                      {s.name}
                    </div>
                    {editing ? (
                      <>
                        <input
                          value={draft.duration}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, duration: e.target.value }))
                          }
                          className="h-8 w-[70px] rounded-lg border border-chip-border text-center text-[12.5px] outline-none"
                        />
                        <input
                          value={draft.price}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, price: e.target.value }))
                          }
                          className="h-8 w-20 rounded-lg border border-chip-border text-center text-[12.5px] outline-none"
                        />
                        <button
                          onClick={() => saveEdit(s.id)}
                          className="grad-gold h-8 cursor-pointer rounded-lg border-none px-3.5 text-xs text-white"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-[70px] text-center text-[12.5px] text-muted">
                          {s.duration_min} min
                        </div>
                        <div className="w-20 text-center font-serif text-[13.5px] font-semibold">
                          {fmtMoney(Number(s.price))}
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => {
                              setEditingId(s.id);
                              setDraft({
                                price: String(s.price),
                                duration: String(s.duration_min),
                              });
                            }}
                            className="h-8 cursor-pointer rounded-lg border border-[#ece2d0] bg-white px-3 text-xs text-gold-dark"
                          >
                            Edit
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="py-10 text-center text-[13px] text-faint">
          No categories yet — run supabase/seed.sql or add services below.
        </div>
      )}

      {adding && (
        <AddServiceModal categories={categories} onClose={() => setAdding(false)} />
      )}
    </>
  );
}

function AddServiceModal({
  categories,
  onClose,
}: {
  categories: ServiceCategory[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [newCat, setNewCat] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    if (!name.trim() || !price) {
      toast("Name & price are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    let catId = categoryId;
    if (newCat.trim()) {
      const { data, error } = await supabase
        .from("service_categories")
        .insert({ name: newCat.trim(), sort_order: categories.length })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast("Category failed: " + (error?.message ?? ""));
        return;
      }
      catId = data.id;
    }
    const { error } = await supabase.from("services").insert({
      category_id: catId,
      name: name.trim(),
      price: parseFloat(price) || 0,
      duration_min: parseInt(duration) || 60,
    });
    setSaving(false);
    if (error) {
      toast("Could not save: " + error.message);
      return;
    }
    toast("Service added");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title="Add service"
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? "Saving…" : "Save service"}
          </PrimaryBtn>
        </>
      }
    >
      <Field label="Service name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gel full set"
          className={inputCls}
        />
      </Field>
      <Field label="Category">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputCls}
          disabled={!!newCat.trim()}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="…or new category">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="e.g. Skincare"
          className={inputCls}
        />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Price ($)">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="55"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Duration (min)">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="90"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
