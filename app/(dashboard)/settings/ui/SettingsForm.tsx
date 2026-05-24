"use client";

import { useState } from "react";
import DateField from "@/app/components/DateField";
import SelectField from "@/app/components/SelectField";
import { resetBusinessTimeAction, updateBusinessTimeAction, updateSettingsAction } from "@/app/(dashboard)/settings/actions";

function formatDateTimeRu(iso: string) {
  const d = new Date(iso);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToHm(iso: string) {
  const d = new Date(iso);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function SettingsForm(props: {
  settings: { fxUsdUzs: string; overpayMode: "DEPOSIT" | "SELLER_MINUS" };
  serverNowIso: string;
  businessNowIso: string;
  businessOffsetMin: number;
}) {
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeOk, setTimeOk] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
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
              <SelectField
                name="overpay_mode"
                label="Переплата"
                defaultValue={props.settings.overpayMode}
                options={[
                  { value: "DEPOSIT", label: "В депозит клиента" },
                  { value: "SELLER_MINUS", label: "Минус продавцу" },
                ]}
                searchable={false}
              />
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

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Резервная копия базы</div>
        <div className="mt-1 text-sm text-zinc-500">Скачайте файл базы и при необходимости восстановите его.</div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="/api/settings/backup"
            className="rounded-xl px-4 py-2 text-sm font-medium btn-primary"
            title="Скачать файл базы данных"
          >
            Скачать резервную копию
          </a>

          <form action="/api/settings/restore" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="backup"
              accept=".sqlite,.db,application/octet-stream"
              className="text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-200 dark:file:bg-zinc-900 dark:file:text-zinc-100 dark:hover:file:bg-zinc-800"
              required
            />
            <button type="submit" className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30">
              Восстановить из файла
            </button>
          </form>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          Важно: восстановление заменяет текущую базу данных. После восстановления обновите страницу.
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Дата и время</div>
        <div className="mt-1 text-sm text-zinc-500">
          Текущее серверное: <span className="font-medium text-zinc-800 dark:text-zinc-100">{formatDateTimeRu(props.serverNowIso)}</span>
          {" · "}
          Системное (в CRM): <span className="font-medium text-zinc-800 dark:text-zinc-100">{formatDateTimeRu(props.businessNowIso)}</span>
        </div>
        <div className="mt-1 text-xs text-zinc-500">Смещение: {props.businessOffsetMin} мин.</div>

        <form
          action={async (formData) => {
            setTimeOk(null);
            setTimeError(null);
            const res = await updateBusinessTimeAction(formData);
            if (!res?.ok) {
              setTimeError("Проверьте дату и время.");
              return;
            }
            setTimeOk("Сохранено. Обновите страницу.");
          }}
          className="mt-4 space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Дата</label>
              <DateField name="biz_date" defaultValue={isoToYmd(props.businessNowIso)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Время</label>
              <input
                name="biz_time"
                defaultValue={isoToHm(props.businessNowIso)}
                type="time"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>

          {timeError ? <div className="text-sm text-red-600">{timeError}</div> : null}
          {timeOk ? <div className="text-sm text-green-700">{timeOk}</div> : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium btn-primary">
              Установить дату/время
            </button>
            <button
              type="button"
              onClick={async () => {
                setTimeOk(null);
                setTimeError(null);
                const res = await resetBusinessTimeAction();
                if (!res?.ok) {
                  setTimeError("Не удалось сбросить.");
                  return;
                }
                setTimeOk("Сброшено. Обновите страницу.");
              }}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Сбросить
            </button>
          </div>

          <div className="text-xs text-zinc-500">
            Примечание: из веб‑приложения нельзя менять системные часы macOS/сервера напрямую — здесь настраивается “время в CRM” (смещение).
          </div>
        </form>
      </div>
    </div>
  );
}
