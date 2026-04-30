"use client";

import { useState } from "react";
import { updateSettingsAction } from "@/app/(dashboard)/settings/actions";

export default function SettingsForm(props: { settings: { fxUsdUzs: string; overpayMode: "DEPOSIT" | "SELLER_MINUS" } }) {
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <form
        action={async (formData) => {
          setOk(null);
          setError(null);
          const res = await updateSettingsAction(formData);
          if (!res?.ok) {
            setError("Проверьте значения.");
            return;
          }
          setOk("Сохранено");
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600">Курс USD → UZS</label>
            <input
              name="fx_usd_uzs"
              defaultValue={props.settings.fxUsdUzs}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Напр. 12500"
            />
            <div className="mt-1 text-xs text-zinc-500">Используется для партий в USD и расчёта прибыли.</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">Переплата</label>
            <select
              name="overpay_mode"
              defaultValue={props.settings.overpayMode}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="DEPOSIT">В депозит клиента</option>
              <option value="SELLER_MINUS">Минус продавцу</option>
            </select>
            <div className="mt-1 text-xs text-zinc-500">Логика для ситуации: чек 700$, оплата 750$.</div>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

        <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium btn-primary">
          Сохранить
        </button>
      </form>
    </div>
  );
}

