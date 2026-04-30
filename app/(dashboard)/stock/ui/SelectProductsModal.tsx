"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";

type ProductOption = { id: string; name: string; sku: string };

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
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

export default function SelectProductsModal(props: {
  open: boolean;
  products: ProductOption[];
  selectedIds: string[];
  onClose: () => void;
  onDone: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(props.selectedIds);

  useEffect(() => {
    if (props.open) setSelected(props.selectedIds);
  }, [props.open, props.selectedIds]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.products;
    return props.products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  }, [props.products, query]);

  const selectedProducts = useMemo(() => {
    const map = new Map(props.products.map((p) => [p.id, p]));
    return selected.map((id) => map.get(id)).filter(Boolean) as ProductOption[];
  }, [props.products, selected]);

  function add(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function remove(id: string) {
    setSelected((prev) => prev.filter((x) => x !== id));
  }

  const isDirty =
    selected.length !== props.selectedIds.length || selected.some((id, i) => id !== props.selectedIds[i]);
  const { confirm, dialog } = useConfirmDialog();
  const requestClose = () => {
    if (!isDirty) {
      props.onClose();
      return;
    }
    confirm(() => props.onClose(), {
      title: "Несохранённые данные",
      message: "Вы изменили список выбранных товаров. Закрыть без сохранения?",
      confirmText: "Закрыть",
      cancelText: "Не закрывать",
    });
  };

  return (
    <Modal open={props.open} title="Выбор товаров" onClose={requestClose}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Товары</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или SKU"
              className="w-56 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div className="mt-3 h-[56vh] overflow-auto pr-1">
            <div className="space-y-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-zinc-500">{p.sku}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    disabled={selectedSet.has(p.id)}
                    className="ml-3 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    aria-label="Добавить"
                    title="Добавить"
                  >
                    +
                  </button>
                </div>
              ))}
              {filtered.length === 0 ? <div className="py-8 text-center text-sm text-zinc-500">Ничего не найдено</div> : null}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            if (id) add(id);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              Выбрано <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] badge-brand">{selected.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Очистить
            </button>
          </div>

          <div className="mt-3 h-[56vh] overflow-auto pr-1">
            {selectedProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
                Перетащите товары сюда или нажмите “+”.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-xs text-zinc-500">{p.sku}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="ml-3 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      aria-label="Убрать"
                      title="Убрать"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Отмена
            </button>
            <button type="button" onClick={() => props.onDone(selected)} className="flex-1 rounded-xl px-3 py-2 text-sm btn-primary">
              Готово
            </button>
          </div>
        </div>
      </div>

      {dialog}
    </Modal>
  );
}
