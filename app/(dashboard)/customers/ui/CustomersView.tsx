"use client";

import { useMemo, useState } from "react";
import CustomersTable from "@/app/(dashboard)/customers/ui/CustomersTable";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  debt_limit: string;
  debt_days: number | null;
  created_at: string;
};

export default function CustomersView(props: { rows: CustomerRow[] }) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return props.rows;
    return props.rows.filter((r) => {
      const name = (r.name ?? "").toLowerCase();
      const phone = (r.phone ?? "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [props.rows, q]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Клиенты</h1>
          <div className="mt-1 text-sm text-zinc-500">Карта клиента, лимит и срок долга.</div>
        </div>

        <div className="w-full sm:w-[360px]">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Поиск</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя или телефон"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </div>

      <div className="mt-6">
        <CustomersTable rows={rows} />
      </div>
    </div>
  );
}

