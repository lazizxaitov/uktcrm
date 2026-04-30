"use client";

import { useMemo, useState } from "react";
import { addStockBatchAction } from "@/app/(dashboard)/stock/actions";

type ProductOption = { id: string; name: string; sku: string };
type BatchRow = {
  id: string;
  product_id: string;
  qty_initial: string;
  qty_remaining: string;
  cost: string;
  currency: string;
  created_at: string;
  name: string;
  sku: string;
};

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
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

export default function StockBatches(props: { products: ProductOption[]; batches: BatchRow[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const products = useMemo(() => props.products, [props.products]);
  const batches = useMemo(() => props.batches, [props.batches]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold">Партии (FIFO)</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            className="rounded-xl px-3 py-2 text-sm btn-primary"
          >
            Приход
          </button>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800" />
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Товар</th>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-left font-medium">Партия</th>
                <th className="px-4 py-3 text-left font-medium">Остаток</th>
                <th className="px-4 py-3 text-left font-medium">Себестоимость</th>
                <th className="px-4 py-3 text-left font-medium">Валюта</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                    Пока нет партий
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-t border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">{b.name}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{b.sku}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{b.qty_initial}</td>
                    <td className="px-4 py-3 font-medium">{b.qty_remaining}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{b.cost}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{b.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Приход партии" onClose={() => setOpen(false)}>
        <form
          action={async (formData) => {
            setError(null);
            const res = await addStockBatchAction(formData);
            if (!res?.ok) {
              setError("Проверьте поля (товар, количество, себестоимость).");
              return;
            }
            setOpen(false);
            window.location.reload();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-600">Товар</label>
            <select
              name="product_id"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              defaultValue={products[0]?.id ?? ""}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Количество" name="qty" placeholder="Напр. 100" />
            <Field label="Себестоимость (за 1)" name="cost" placeholder="Напр. 12000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">Валюта партии</label>
            <select
              name="currency"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              defaultValue="UZS"
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
            <div className="mt-1 text-xs text-zinc-500">Для USD курс берётся из настроек.</div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Добавить
          </button>
        </form>
      </Modal>
    </div>
  );
}

