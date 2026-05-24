"use client";

import { useEffect, useMemo, useState } from "react";

type ProductOption = { id: string; name: string; sku: string };
export type DraftSaleItem = { productId: string; qty: string; price: string };

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

function toNum(x: string) {
  const v = Number(String(x).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export default function SaleItemsPickerModal(props: {
  open: boolean;
  products: ProductOption[];
  items: DraftSaleItem[];
  onClose: () => void;
  onDone: (items: DraftSaleItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DraftSaleItem[]>(props.items);

  useEffect(() => {
    if (props.open) setItems(props.items);
  }, [props.open, props.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.products;
    return props.products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  }, [props.products, query]);

  const selectedMap = useMemo(() => new Map(items.map((it) => [it.productId, it])), [items]);
  const productMap = useMemo(() => new Map(props.products.map((p) => [p.id, p])), [props.products]);

  const totalQty = useMemo(() => items.reduce((acc, it) => acc + toNum(it.qty), 0), [items]);
  const totalSum = useMemo(() => items.reduce((acc, it) => acc + toNum(it.qty) * toNum(it.price), 0), [items]);

  const add = (productId: string) => {
    setItems((prev) => {
      if (prev.some((x) => x.productId === productId)) return prev;
      return [...prev, { productId, qty: "1", price: "" }];
    });
  };

  const remove = (productId: string) => setItems((prev) => prev.filter((x) => x.productId !== productId));

  return (
    <Modal open={props.open} title="Добавить товары" onClose={props.onClose}>
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
                    disabled={selectedMap.has(p.id)}
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
              Выбрано{" "}
              <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] badge-brand">
                {items.length} • {totalQty.toLocaleString("ru-RU")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Очистить
            </button>
          </div>

          <div className="mt-3 h-[56vh] overflow-auto pr-1">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
                Перетащите товары сюда или нажмите “+”.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => {
                  const p = productMap.get(it.productId);
                  if (!p) return null;
                  return (
                    <div key={it.productId} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="truncate text-xs text-zinc-500">{p.sku}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(it.productId)}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                          aria-label="Убрать"
                          title="Убрать"
                        >
                          ×
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600">Количество</label>
                          <input
                            value={it.qty}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItems((prev) => prev.map((x) => (x.productId === it.productId ? { ...x, qty: v } : x)));
                            }}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
                            placeholder="Напр. 2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600">Цена</label>
                          <input
                            value={it.price}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItems((prev) => prev.map((x) => (x.productId === it.productId ? { ...x, price: v } : x)));
                            }}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
                            placeholder="Напр. 15000"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Сумма: {(toNum(it.qty) * toNum(it.price)).toLocaleString("ru-RU")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-zinc-600 dark:text-zinc-300">
              Итого: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{totalSum.toLocaleString("ru-RU")}</span>
            </div>
            <button type="button" onClick={() => props.onDone(items)} className="rounded-xl px-4 py-2 text-sm btn-primary">
              Готово
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

