"use client";

import { useMemo, useState } from "react";
import ProductsTable from "@/app/(dashboard)/products/ui/ProductsTable";

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

export default function ProductsView(props: { rows: ProductRow[]; categories: Array<{ id: string; name: string }> }) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return props.rows;
    return props.rows.filter((r) => {
      const name = (r.name ?? "").toLowerCase();
      const sku = (r.sku ?? "").toLowerCase();
      const barcode = (r.barcode ?? "").toLowerCase();
      return name.includes(query) || sku.includes(query) || barcode.includes(query);
    });
  }, [props.rows, q]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Товары</h1>
          <div className="mt-1 text-sm text-zinc-500">SKU, категории, точки заказа и safety stock.</div>
        </div>

        <div className="w-full sm:w-[360px]">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Поиск</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Название, SKU или штрих‑код"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </div>

      <div className="mt-6">
        <ProductsTable rows={rows} categories={props.categories} />
      </div>
    </div>
  );
}

