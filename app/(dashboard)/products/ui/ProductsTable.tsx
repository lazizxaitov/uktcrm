"use client";

import { useMemo, useState } from "react";
import { upsertProductAction } from "@/app/(dashboard)/products/actions";

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

export default function ProductsTable(props: { rows: ProductRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => props.rows, [props.rows]);

  const startCreate = () => {
    setError(null);
    setEditing(null);
    setOpen(true);
  };

  const startEdit = (row: ProductRow) => {
    setError(null);
    setEditing(row);
    setOpen(true);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold">Список товаров</div>
        <button type="button" onClick={startCreate} className="rounded-xl px-3 py-2 text-sm btn-primary">
          Добавить
        </button>
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
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                  Нет товаров
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.sku}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.safety_stock}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.reorder_point}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    >
                      Изменить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={editing ? "Редактировать товар" : "Новый товар"} onClose={() => setOpen(false)}>
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
    </div>
  );
}

