"use client";

import { useEffect, useMemo, useState } from "react";
import { addStockReceiptAction } from "@/app/(dashboard)/stock/actions";
import SelectProductsModal from "@/app/(dashboard)/stock/ui/SelectProductsModal";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";

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
  const [openReceipt, setOpenReceipt] = useState(false);
  const [openSelectProducts, setOpenSelectProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [dirtyReceipt, setDirtyReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => props.products, [props.products]);
  const batches = useMemo(() => props.batches, [props.batches]);

  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("receipt") !== "1") return;
    sp.delete("receipt");
    const next = sp.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}`;
    window.history.replaceState(null, "", url);
    setError(null);
    setSelectedProductIds([]);
    setDirtyReceipt(false);
    setOpenReceipt(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold">Партии (FIFO)</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSelectedProductIds([]);
              setDirtyReceipt(false);
              setOpenReceipt(true);
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

      <Modal
        open={openReceipt}
        title="Приход партии"
        onClose={() => {
          if (!dirtyReceipt) {
            setOpenReceipt(false);
            return;
          }
          confirm(() => setOpenReceipt(false), {
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
            const qty = String(formData.get("qty") ?? "").trim();
            const cost = String(formData.get("cost") ?? "").trim();
            const currency = String(formData.get("currency") ?? "UZS").trim().toUpperCase();
            if (selectedProductIds.length === 0) {
              setError("Выберите товары для прихода.");
              return;
            }
            formData.set(
              "items_json",
              JSON.stringify(
                selectedProductIds.map((productId) => ({
                  productId,
                  qty,
                  cost,
                  currency,
                })),
              ),
            );
            const res = await addStockReceiptAction(formData);
            if (!res?.ok) {
              setError("Проверьте поля (товары, количество, себестоимость).");
              return;
            }
            setOpenReceipt(false);
            window.location.reload();
          }}
          onChange={() => setDirtyReceipt(true)}
          className="space-y-3"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-zinc-600">
                Товар{" "}
                <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] badge-brand">Выбрано: {selectedProductIds.length}</span>
              </label>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                {selectedProductIds.length === 0 ? "Нажмите “+” и выберите товары" : `Выбрано товаров: ${selectedProductIds.length}`}
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setOpenSelectProducts(true);
                }}
                className="h-[38px] w-[44px] rounded-xl border border-zinc-200 bg-white text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                aria-label="Выбрать товары"
                title="Выбрать товары"
              >
                +
              </button>
            </div>
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

      <SelectProductsModal
        open={openSelectProducts}
        products={products}
        selectedIds={selectedProductIds}
        onClose={() => setOpenSelectProducts(false)}
        onDone={(ids) => {
          setSelectedProductIds(ids);
          setDirtyReceipt(true);
          setOpenSelectProducts(false);
        }}
      />

      {dialog}
    </div>
  );
}
