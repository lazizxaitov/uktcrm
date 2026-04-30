"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteCustomerAction, upsertCustomerAction } from "@/app/(dashboard)/customers/actions";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  debt_limit: string;
  debt_days: number | null;
  created_at: string;
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

export default function CustomersTable(props: { rows: CustomerRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerRow | null>(null);
  const [dirtyCustomer, setDirtyCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => props.rows, [props.rows]);

  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") !== "1") return;
    sp.delete("new");
    const next = sp.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}`;
    window.history.replaceState(null, "", url);
    setError(null);
    setEditing(null);
    setDirtyCustomer(false);
    setOpen(true);
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold">Клиентская база</div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing(null);
            setDirtyCustomer(false);
            setOpen(true);
          }}
          className="rounded-xl px-3 py-2 text-sm btn-primary"
        >
          Добавить
        </button>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800" />
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Клиент</th>
              <th className="px-4 py-3 text-left font-medium">Телефон</th>
              <th className="px-4 py-3 text-left font-medium">Лимит долга</th>
              <th className="px-4 py-3 text-left font-medium">Срок (дни)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                  Нет клиентов
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.debt_limit}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.debt_days ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditing(r);
                          setDirtyCustomer(false);
                          setOpen(true);
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirmDelete(r);
                        }}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать клиента" : "Новый клиент"}
        onClose={() => {
          if (!dirtyCustomer) {
            setOpen(false);
            return;
          }
          confirm(() => setOpen(false), {
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
            const res = await upsertCustomerAction(formData);
            if (!res?.ok) {
              setError("Проверьте поля (имя, лимит, срок).");
              return;
            }
            setOpen(false);
            window.location.reload();
          }}
          onChange={() => setDirtyCustomer(true)}
          className="space-y-3"
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Field label="Имя" name="name" defaultValue={editing?.name ?? ""} />
          <Field label="Телефон" name="phone" defaultValue={editing?.phone ?? ""} placeholder="Необязательно" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Лимит долга" name="debt_limit" defaultValue={editing?.debt_limit ?? "0"} placeholder="0" />
            <Field label="Срок долга (дни)" name="debt_days" defaultValue={editing?.debt_days?.toString() ?? ""} type="number" placeholder="Напр. 30" />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
            Сохранить
          </button>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} title="Удалить клиента" onClose={() => setConfirmDelete(null)}>
        <div className="space-y-3">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            Удалить клиента <span className="font-semibold">«{confirmDelete?.name}»</span>? Это действие нельзя отменить.
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Отмена
            </button>
            <form
              className="flex-1"
              action={async (formData) => {
                setError(null);
                if (!confirmDelete) return;
                formData.set("id", confirmDelete.id);
                const res = await deleteCustomerAction(formData);
                if (!res?.ok) {
                  setError(res?.reason ?? "Не удалось удалить.");
                  return;
                }
                setConfirmDelete(null);
                window.location.reload();
              }}
            >
              <button type="submit" className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
                Удалить
              </button>
            </form>
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
