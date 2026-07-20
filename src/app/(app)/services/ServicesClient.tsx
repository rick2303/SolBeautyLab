"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, PrimaryBtn, GhostBtn } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { useLang } from "@/components/LangProvider";
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
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();
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
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    setEditingId(null);
    toast(t("Service updated"));
    router.refresh();
  }

  return (
    <>
      {isOwner && (
        <div className="mb-3.5 flex justify-end gap-2">
          <button
            onClick={() => setAddingCat(true)}
            className="h-9 cursor-pointer rounded-[20px] border border-chip-border bg-card px-4 text-[12.5px] font-medium text-gold-dark"
          >
            {t("+ Add category")}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="h-9 cursor-pointer rounded-[20px] border border-chip-border bg-card px-4 text-[12.5px] font-medium text-gold-dark"
          >
            {t("+ Add service")}
          </button>
        </div>
      )}

      {categories.map((cat) => {
        const items = services.filter((s) => s.category_id === cat.id);
        // Las vacías solo las ve la dueña (para poder editarlas/desactivarlas)
        if (items.length === 0 && !isOwner) return null;
        return (
          <div
            key={cat.id}
            className={`mb-[18px] ${cat.is_active === false ? "opacity-55" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif text-lg font-semibold text-gold-dark">
                <span className="text-[16px]">{cat.icon ?? "❀"}</span>
                {cat.name}
                {cat.is_active === false && (
                  <span className="rounded-[20px] bg-tan px-2 py-0.5 font-sans text-[9px] font-medium tracking-[0.08em] text-[#8a8178]">
                    {t("INACTIVE")}
                  </span>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setEditingCat(cat)}
                  className="h-7 cursor-pointer rounded-[20px] border border-line-2 bg-white px-3 text-[11px] text-gold-dark"
                >
                  {t("Edit")}
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-line-2 bg-card p-4 text-center text-[11.5px] text-faint">
                {t("No services in this category yet")}
              </div>
            ) : (
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
                          {t("Save")}
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
                            {t("Edit")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="py-10 text-center text-[13px] text-faint">
          {t("No categories yet — run supabase/seed.sql or add services below.")}
        </div>
      )}

      {adding && (
        <AddServiceModal categories={categories} onClose={() => setAdding(false)} />
      )}
      {addingCat && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setAddingCat(false)}
        />
      )}
      {editingCat && (
        <EditCategoryModal
          category={editingCat}
          onClose={() => setEditingCat(null)}
        />
      )}
    </>
  );
}

// Glifos monocromos disponibles para categorías (sin emojis)
const CATEGORY_ICONS = [
  "❀", "✿", "❁", "❃", "❋", "⚘",
  "✧", "✦", "✤", "✻", "✺", "❖",
  "✄", "♛", "❦", "☾", "♡", "◈",
];

function AddCategoryModal({
  categories,
  onClose,
}: {
  categories: ServiceCategory[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("❀");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim()) {
      toast(t("Category name is required"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("service_categories").insert({
      name: name.trim(),
      sort_order: categories.length,
      icon,
    });
    setSaving(false);
    if (error) {
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Category added"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Add category")}
      onClose={onClose}
      width={420}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save category")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Category name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g. Skincare")}
          autoFocus
          className={inputCls}
        />
      </Field>
      <Field label={t("Icon")}>
        <IconPicker value={icon} onChange={setIcon} />
      </Field>
    </Modal>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (ic: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {CATEGORY_ICONS.map((ic) => (
        <button
          key={ic}
          onClick={() => onChange(ic)}
          className={`h-10 cursor-pointer rounded-[10px] border text-[18px] ${
            value === ic
              ? "grad-gold-soft border-gold text-gold-deep"
              : "border-input bg-white text-[#8a8178]"
          }`}
        >
          {ic}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-muted">{hint}</div>
      </div>
      <div
        onClick={onToggle}
        className="cursor-pointer rounded-[20px] p-[3px] transition-colors"
        style={{
          width: 44,
          height: 26,
          background: on ? "#8a6526" : "#e0d4bd",
        }}
      >
        <div
          className="h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: on ? "translateX(18px)" : "none" }}
        />
      </div>
    </div>
  );
}

function EditCategoryModal({
  category,
  onClose,
}: {
  category: ServiceCategory;
  onClose: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? "❀");
  const [active, setActive] = useState(category.is_active !== false);
  const [hidePrices, setHidePrices] = useState(category.hide_prices === true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim()) {
      toast(t("Category name is required"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("service_categories")
      .update({
        name: name.trim(),
        icon,
        is_active: active,
        hide_prices: hidePrices,
      })
      .eq("id", category.id);
    setSaving(false);
    if (error) {
      toast(t("Update failed:") + " " + error.message);
      return;
    }
    toast(t("Category updated"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Edit category")}
      onClose={onClose}
      width={420}
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
      <Field label={t("Category name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label={t("Icon")}>
        <IconPicker value={icon} onChange={setIcon} />
      </Field>
      <ToggleRow
        label={t("Active")}
        hint={t("Inactive categories are hidden from online booking")}
        on={active}
        onToggle={() => setActive((v) => !v)}
      />
      <ToggleRow
        label={t("Hide prices in online booking")}
        hint={t("Clients see services without prices — pricing is discussed at the salon")}
        on={hidePrices}
        onToggle={() => setHidePrices((v) => !v)}
      />
    </Modal>
  );
}

function AddServiceModal({
  categories,
  onClose,
}: {
  categories: ServiceCategory[];
  onClose: () => void;
}) {
  // Solo se pueden agregar servicios a categorías activas
  const activeCats = categories.filter((c) => c.is_active !== false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(activeCats[0]?.id ?? "");
  const [newCat, setNewCat] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useLang();

  async function save() {
    if (!name.trim() || !price) {
      toast(t("Name & price are required"));
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
        toast(t("Category failed:") + " " + (error?.message ?? ""));
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
      toast(t("Could not save:") + " " + error.message);
      return;
    }
    toast(t("Service added"));
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={t("Add service")}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} className="flex-1">
            {t("Cancel")}
          </GhostBtn>
          <PrimaryBtn onClick={save} loading={saving} className="flex-[2]">
            {saving ? t("Saving…") : t("Save service")}
          </PrimaryBtn>
        </>
      }
    >
      <Field label={t("Service name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g. Gel full set")}
          className={inputCls}
        />
      </Field>
      <Field label={t("Category")}>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputCls}
          disabled={!!newCat.trim()}
        >
          {activeCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("…or new category")}>
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder={t("e.g. Skincare")}
          className={inputCls}
        />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label={t("Price ($)")}>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="55"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label={t("Duration (min)")}>
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
