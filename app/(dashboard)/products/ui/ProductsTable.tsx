"use client";

import { useMemo, useState } from "react";
import { deleteProductAction, upsertProductAction } from "@/app/(dashboard)/products/actions";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  box_size: number | null;
  safety_stock: string;
  reorder_point: string;
};

function Field(props: { label: string; name: string; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600">{props.label}</label>
      <input
        name={props.name}
        defaultValue={props.defaultValue}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
      />
    </div>
  );
}

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="text-sm font-semibold">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Закрыть
          </button>
        </div>
        <div className="p-5">{props.children}</div>
      </div>
    </div>
  );
}

export default function ProductsTable(props: { rows: ProductRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [openCategories, setOpenCategories] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);
  const [dirtyProduct, setDirtyProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => props.rows, [props.rows]);

  const { confirm, dialog } = useConfirmDialog();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const c = (r.category ?? "").trim();
      if (c) set.add(c);
    }
    for (const c of extraCategories) {
      const v = c.trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows, extraCategories]);

  const filteredRows = useMemo(() => {
    if (!categoryFilter) return rows;
    return rows.filter((r) => (r.category ?? "").trim() === categoryFilter);
  }, [rows, categoryFilter]);

  const startCreate = () => {
    setError(null);
    setEditing(null);
    setDirtyProduct(false);
    setOpen(true);
  };

  const startEdit = (row: ProductRow) => {
    setError(null);
    setEditing(row);
    setDirtyProduct(false);
    setOpen(true);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">Список товаров</div>
          {categoryFilter ? (
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              title="Сбросить фильтр"
            >
              Категория: {categoryFilter} <span className="text-zinc-400">×</span>
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewCategory("");
              setOpenCategories(true);
            }}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Категории
          </button>
          <button type="button" onClick={startCreate} className="rounded-xl px-3 py-2 text-sm btn-primary">
            Добавить
          </button>
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800" />
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Товар</th>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Категория</th>
              <th className="px-4 py-3 text-left font-medium">Safety</th>
              <th className="px-4 py-3 text-left font-medium">Reorder</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                  {rows.length === 0 ? "Нет товаров" : "Нет товаров в этой категории"}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.sku}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.safety_stock}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.reorder_point}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirmDelete(r);
                        }}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать товар" : "Новый товар"}
        onClose={() => {
          if (!dirtyProduct) {
            setOpen(false);
            return;
          }
          confirm(() => setOpen(false), {
            title: "Несохранённые данные",
            message: "Есть несохранённые изменения. Закрыть без сохранения?",
            confirmText: "Закрыть",
            cancelText: "Не закрывать",
          });
        }}
      >
        <form
          action={async (formData) => {
            setError(null);
            const res = await upsertProductAction(formData);
            if (!res?.ok) {
              setError("Проверьте поля (название, SKU, размеры).");
              return;
            }
            setOpen(false);
            window.location.reload();
          }}
          onChange={() => setDirtyProduct(true)}
          className="space-y-3"
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Field label="Название" name="name" defaultValue={editing?.name ?? ""} />
          <Field label="SKU" name="sku" defaultValue={editing?.sku ?? ""} />
          <Field label="Штрихкод" name="barcode" defaultValue={editing?.barcode ?? ""} placeholder="Необязательно" />
          <Field label="Категория" name="category" defaultValue={editing?.category ?? ""} placeholder="Необязательно" />
          <Field label="Коробка (X шт)" name="box_size" defaultValue={editing?.box_size?.toString() ?? ""} type="number" placeholder="Напр. 12" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Safety stock" name="safety_stock" defaultValue={editing?.safety_stock ?? "0"} />
            <Field label="Reorder point" name="reorder_point" defaultValue={editing?.reorder_point ?? "0"} />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Сохранить
          </button>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} title="Удалить товар" onClose={() => setConfirmDelete(null)}>
        <div className="space-y-3">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            Удалить товар <span className="font-semibold">«{confirmDelete?.name}»</span>? Это действие нельзя отменить.
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Отмена
            </button>
            <form
              className="flex-1"
              action={async (formData) => {
                setError(null);
                if (!confirmDelete) return;
                formData.set("id", confirmDelete.id);
                const res = await deleteProductAction(formData);
                if (!res?.ok) {
                  setError(res?.reason ?? "Не удалось удалить.");
                  return;
                }
                setConfirmDelete(null);
                window.location.reload();
              }}
            >
              <button type="submit" className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
                Удалить
              </button>
            </form>
          </div>
        </div>
      </Modal>

      <Modal
        open={openCategories}
        title="Категории"
        onClose={() => {
          if (!newCategory.trim()) {
            setOpenCategories(false);
            return;
          }
          confirm(() => setOpenCategories(false), {
            title: "Несохранённые данные",
            message: "Вы начали вводить новую категорию. Закрыть без сохранения?",
            confirmText: "Закрыть",
            cancelText: "Не закрывать",
          });
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Новая категория</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Напр. Напитки"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const v = newCategory.trim();
                if (!v) return;
                const exists =
                  categories.some((c) => c.toLowerCase() === v.toLowerCase()) ||
                  extraCategories.some((c) => c.toLowerCase() === v.toLowerCase());
                if (!exists) setExtraCategories((prev) => [...prev, v]);
                setCategoryFilter(v);
                setOpenCategories(false);
              }}
              className="mt-5 rounded-xl px-4 py-2 text-sm btn-primary"
            >
              Создать
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter(null);
                setOpenCategories(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
            >
              <span className="font-medium">Все категории</span>
              {!categoryFilter ? <span className="text-xs text-[var(--brand)]">Выбрано</span> : null}
            </button>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <div className="max-h-[45vh] overflow-auto">
              {categories.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500">Пока нет категорий.</div>
              ) : (
                categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(c);
                      setOpenCategories(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                  >
                    <span className="truncate">{c}</span>
                    {categoryFilter === c ? <span className="text-xs text-[var(--brand)]">Выбрано</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
