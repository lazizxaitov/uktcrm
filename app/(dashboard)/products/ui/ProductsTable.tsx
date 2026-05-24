"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  deleteProductAction,
  renameCategoryAction,
  upsertProductAction,
} from "@/app/(dashboard)/products/actions";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";
import SelectField from "@/app/components/SelectField";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string | null;
  category_name: string | null;
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

export default function ProductsTable(props: { rows: ProductRow[]; categories: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [openCategories, setOpenCategories] = useState(false);
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);
  const [dirtyProduct, setDirtyProduct] = useState(false);
  const [sort, setSort] = useState<{ key: "name" | "sku" | "category" | "safety" | "reorder"; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => props.rows, [props.rows]);

  const { confirm, dialog } = useConfirmDialog();

  const categories = useMemo(() => props.categories, [props.categories]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const filterLabel = categoryFilterId ? categoryById.get(categoryFilterId) ?? "Категория" : null;

  const filteredRows = useMemo(() => {
    if (!categoryFilterId) return rows;
    return rows.filter((r) => r.category_id === categoryFilterId);
  }, [rows, categoryFilterId]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    const dir = sort.dir === "asc" ? 1 : -1;
    const byText = (a: string | null, b: string | null) => String(a ?? "").localeCompare(String(b ?? ""), "ru") * dir;
    const byNum = (a: string, b: string) => ((Number(a) || 0) - (Number(b) || 0)) * dir;

    arr.sort((a, b) => {
      switch (sort.key) {
        case "sku":
          return byText(a.sku, b.sku) || byText(a.name, b.name);
        case "category":
          return byText(a.category_name, b.category_name) || byText(a.name, b.name);
        case "safety":
          return byNum(a.safety_stock, b.safety_stock) || byText(a.name, b.name);
        case "reorder":
          return byNum(a.reorder_point, b.reorder_point) || byText(a.name, b.name);
        case "name":
        default:
          return byText(a.name, b.name) || byText(a.sku, b.sku);
      }
    });
    return arr;
  }, [filteredRows, sort]);

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

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") !== "1") return;
    sp.delete("new");
    const next = sp.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}`;
    window.history.replaceState(null, "", url);
    startCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">Список товаров</div>
          {categoryFilterId && filterLabel ? (
            <button
              type="button"
              onClick={() => setCategoryFilterId(null)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              title="Сбросить фильтр"
            >
              Категория: {filterLabel} <span className="text-zinc-400">×</span>
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewCategoryName("");
              setEditCategoryId(null);
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
              <th className="px-4 py-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: "name", dir: s.key === "name" && s.dir === "desc" ? "asc" : "desc" }))}
                  className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Сортировать"
                >
                  Товар {sort.key === "name" ? (sort.dir === "asc" ? "↑" : "↓") : null}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: "sku", dir: s.key === "sku" && s.dir === "desc" ? "asc" : "desc" }))}
                  className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Сортировать"
                >
                  SKU {sort.key === "sku" ? (sort.dir === "asc" ? "↑" : "↓") : null}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: "category", dir: s.key === "category" && s.dir === "desc" ? "asc" : "desc" }))}
                  className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Сортировать"
                >
                  Категория {sort.key === "category" ? (sort.dir === "asc" ? "↑" : "↓") : null}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: "safety", dir: s.key === "safety" && s.dir === "desc" ? "asc" : "desc" }))}
                  className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Сортировать"
                >
                  Минимум {sort.key === "safety" ? (sort.dir === "asc" ? "↑" : "↓") : null}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: "reorder", dir: s.key === "reorder" && s.dir === "desc" ? "asc" : "desc" }))}
                  className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Сортировать"
                >
                  Точка заказа {sort.key === "reorder" ? (sort.dir === "asc" ? "↑" : "↓") : null}
                </button>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                  {rows.length === 0 ? "Нет товаров" : "Нет товаров в этой категории"}
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.sku}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.category_name ?? "—"}</td>
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
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-zinc-600">Категория</label>
              <button
                type="button"
                onClick={() => {
                  setNewCategoryName("");
                  setEditCategoryId(null);
                  setOpenCategories(true);
                }}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                Управлять
              </button>
            </div>
            <SelectField
              name="category_id"
              defaultValue={editing?.category_id ?? ""}
              placeholder="—"
              options={[{ value: "", label: "—" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              searchable
            />
          </div>
          <Field label="Коробка (X шт)" name="box_size" defaultValue={editing?.box_size?.toString() ?? ""} type="number" placeholder="Напр. 12" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Safety stock (минимум)" name="safety_stock" defaultValue={editing?.safety_stock ?? "0"} />
            <Field label="Точка заказа (reorder)" name="reorder_point" defaultValue={editing?.reorder_point ?? "0"} />
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
          if (!newCategoryName.trim()) {
            setOpenCategories(false);
            return;
          }
          confirm(() => setOpenCategories(false), {
            title: "Несохранённые данные",
            message: "Вы начали вводить категорию. Закрыть без сохранения?",
            confirmText: "Закрыть",
            cancelText: "Не закрывать",
          });
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div>
              <label className="block text-xs font-medium text-zinc-600">{editCategoryId ? "Переименовать категорию" : "Новая категория"}</label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Напр. Напитки"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const v = newCategoryName.trim();
                if (!v) return;
                if (editCategoryId) {
                  const fd = new FormData();
                  fd.set("id", editCategoryId);
                  fd.set("name", v);
                  renameCategoryAction(fd).then((res) => {
                    if (!res?.ok) {
                      setError("Не удалось переименовать.");
                      return;
                    }
                    setOpenCategories(false);
                    window.location.reload();
                  });
                  return;
                }
                const fd = new FormData();
                fd.set("name", v);
                createCategoryAction(fd).then((res) => {
                  if (!res?.ok) {
                    setError("Не удалось создать категорию.");
                    return;
                  }
                  setOpenCategories(false);
                  window.location.reload();
                });
              }}
              className="mt-5 rounded-xl px-4 py-2 text-sm btn-primary"
            >
              {editCategoryId ? "Сохранить" : "Создать"}
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setCategoryFilterId(null);
                setOpenCategories(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
            >
              <span className="font-medium">Все категории</span>
              {!categoryFilterId ? <span className="text-xs text-[var(--brand)]">Выбрано</span> : null}
            </button>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <div className="max-h-[45vh] overflow-auto">
              {categories.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500">Пока нет категорий.</div>
              ) : (
                categories.map((c) => {
                  const isSelected = categoryFilterId === c.id;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilterId(c.id);
                          setOpenCategories(false);
                        }}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-sm"
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected ? <span className="shrink-0 text-xs text-[var(--brand)]">Выбрано</span> : null}
                      </button>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setEditCategoryId(c.id);
                            setNewCategoryName(c.name);
                          }}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            confirm(() => {
                              const fd = new FormData();
                              fd.set("id", c.id);
                              deleteCategoryAction(fd).then((res) => {
                                if (!res?.ok) {
                                  setError((res as any)?.reason ?? "Не удалось удалить.");
                                  return;
                                }
                                window.location.reload();
                              });
                            }, {
                              title: "Удалить категорию",
                              message: `Удалить категорию «${c.name}»?`,
                              confirmText: "Удалить",
                              cancelText: "Отмена",
                            });
                          }}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
