"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addSaleItemAction, closeSaleAction, openSaleAction, refundSaleAction, removeSaleItemAction } from "@/app/(dashboard)/sales/actions";

type CustomerOption = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string };

type OpenSale = { id: string; currency: string; created_at: string; customer_id: string | null; customer_name: string | null } | null;
type OpenItem = { id: string; product_id: string; qty: string; price: string; total: string; name: string; sku: string };
type SaleRow = { id: string; status: string; currency: string; total: string; paid: string; created_at: string; closed_at: string | null; customer_name: string | null };

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

export default function SalesView(props: {
  customers: CustomerOption[];
  products: ProductOption[];
  openSale: OpenSale;
  openItems: OpenItem[];
  lastSales: SaleRow[];
}) {
  const customers = useMemo(() => props.customers, [props.customers]);
  const products = useMemo(() => props.products, [props.products]);
  const [openOpen, setOpenOpen] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openSale = props.openSale;
  const openItems = props.openItems;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold">Текущий чек</div>
          {!openSale ? (
            <button type="button" onClick={() => setOpenOpen(true)} className="rounded-xl px-3 py-2 text-sm btn-primary">
              Открыть чек
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpenAdd(true)} className="rounded-xl px-3 py-2 text-sm btn-primary">
                Добавить позицию
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setOpenClose(true);
                }}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                Закрыть чек
              </button>
            </div>
          )}
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800" />
        <div className="p-4">
          {!openSale ? (
            <div className="text-sm text-zinc-500">Нет открытого чека.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full px-2 py-1 text-xs badge-brand">OPEN</span>
                <span className="text-zinc-600">Валюта: {openSale.currency}</span>
                <span className="text-zinc-600">Клиент: {openSale.customer_name ?? "—"}</span>
                <span className="text-zinc-500">#{openSale.id}</span>
              </div>

              <div className="overflow-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Товар</th>
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-right font-medium">Кол-во</th>
                      <th className="px-3 py-2 text-right font-medium">Цена</th>
                      <th className="px-3 py-2 text-right font-medium">Сумма</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {openItems.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-zinc-500" colSpan={6}>
                          Нет позиций
                        </td>
                      </tr>
                    ) : (
                      openItems.map((it) => (
                        <tr key={it.id} className="border-t border-zinc-100 dark:border-zinc-900">
                          <td className="px-3 py-2">{it.name}</td>
                          <td className="px-3 py-2 text-zinc-600">{it.sku}</td>
                          <td className="px-3 py-2 text-right">{it.qty}</td>
                          <td className="px-3 py-2 text-right">{it.price}</td>
                          <td className="px-3 py-2 text-right font-medium">{it.total}</td>
                          <td className="px-3 py-2 text-right">
                            <form
                              action={async (fd) => {
                                setError(null);
                                const res = await removeSaleItemAction(fd);
                                if (!res?.ok) setError("Не удалось удалить позицию.");
                                else window.location.reload();
                              }}
                            >
                              <input type="hidden" name="id" value={it.id} />
                              <button
                                type="submit"
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                              >
                                Удалить
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
              <div className="text-xs text-zinc-500">При закрытии: списание по FIFO, оплата нал/карта/смешанная, переплата → депозит или минус.</div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-4 py-3 text-sm font-semibold">Последние чеки</div>
        <div className="border-t border-zinc-200 dark:border-zinc-800" />
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
                <th className="px-4 py-3 text-left font-medium">Клиент</th>
                <th className="px-4 py-3 text-left font-medium">Сумма</th>
                <th className="px-4 py-3 text-left font-medium">Оплачено</th>
                <th className="px-4 py-3 text-left font-medium">Когда</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {props.lastSales.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                    Нет чеков
                  </td>
                </tr>
              ) : (
                props.lastSales.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-1 text-xs badge-brand">{s.status}</span>
                    </td>
                    <td className="px-4 py-3">{s.customer_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {s.total} {s.currency}
                    </td>
                    <td className="px-4 py-3">
                      {s.paid} {s.currency}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{s.created_at.slice(0, 19).replace("T", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "CLOSED" ? (
                        <div className="flex justify-end gap-2">
                          <Link
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                            href={`/api/sales/${s.id}/receipt.pdf`}
                            target="_blank"
                          >
                            PDF
                          </Link>
                          <button
                            type="button"
                            onClick={() => setRefundId(s.id)}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                          >
                            Возврат
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={openOpen} title="Открыть чек" onClose={() => setOpenOpen(false)}>
        <form
          action={async (fd) => {
            const res = await openSaleAction(fd);
            if (!res?.ok) setError("Не удалось открыть чек.");
            setOpenOpen(false);
            window.location.reload();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-600">Клиент (необязательно)</label>
            <select
              name="customer_id"
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">Валюта чека</label>
            <select
              name="currency"
              defaultValue="UZS"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Открыть
          </button>
        </form>
      </Modal>

      <Modal open={openAdd} title="Добавить позицию" onClose={() => setOpenAdd(false)}>
        <form
          action={async (fd) => {
            if (!openSale) return;
            fd.set("sale_id", openSale.id);
            const res = await addSaleItemAction(fd);
            if (!res?.ok) setError("Проверьте поля (товар, кол-во, цена).");
            setOpenAdd(false);
            window.location.reload();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-600">Товар</label>
            <select
              name="product_id"
              defaultValue={products[0]?.id ?? ""}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Количество" name="qty" placeholder="Напр. 2" />
            <Field label="Цена" name="price" placeholder="Напр. 15000" />
          </div>
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Добавить
          </button>
        </form>
      </Modal>

      <Modal open={openClose} title="Закрыть чек" onClose={() => setOpenClose(false)}>
        <form
          action={async (fd) => {
            if (!openSale) return;
            fd.set("sale_id", openSale.id);
            const res = await closeSaleAction(fd);
            if (!res?.ok) {
              if (res.error === "NO_STOCK") setError("Недостаточно товара на складе (FIFO).");
              else if (res.error === "EMPTY") setError("Чек пустой.");
              else setError("Не удалось закрыть чек.");
              return;
            }
            setOpenClose(false);
            window.location.reload();
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Наличные" name="cash" defaultValue="0" />
            <Field label="Карта" name="card" defaultValue="0" />
          </div>
          <div className="text-xs text-zinc-500">Сумма оплат может быть больше суммы чека: переплата уйдёт в депозит или в минус продавцу (см. настройки).</div>
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Закрыть и списать
          </button>
        </form>
      </Modal>

      <Modal open={!!refundId} title="Возврат" onClose={() => setRefundId(null)}>
        <div className="space-y-3 text-sm">
          <div>Подтвердить возврат по чеку: {refundId}</div>
          <form
            action={async (fd) => {
              fd.set("sale_id", refundId ?? "");
              const res = await refundSaleAction(fd);
              if (!res?.ok) setError("Не удалось сделать возврат.");
              setRefundId(null);
              window.location.reload();
            }}
          >
            <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
              Подтвердить
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

