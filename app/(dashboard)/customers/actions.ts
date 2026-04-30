"use server";

import { nanoid } from "nanoid";
import { db } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function upsertCustomerAction(formData: FormData) {
  const user = await requireUser();
  const database = db();

  const id = str(formData, "id");
  const name = str(formData, "name");
  const phone = str(formData, "phone") || null;
  const debtLimit = str(formData, "debt_limit") || "0";
  const debtDaysRaw = str(formData, "debt_days");
  const debtDays = debtDaysRaw ? Number(debtDaysRaw) : null;
  if (!name) return { ok: false as const };
  if (debtDaysRaw && (!Number.isFinite(debtDays) || debtDays! <= 0)) return { ok: false as const };

  if (id) {
    database.prepare("UPDATE customers SET name=?, phone=?, debt_limit=?, debt_days=? WHERE id=?").run(name, phone, debtLimit, debtDays, id);
    logAudit({ userId: user.id, action: "UPDATE", entity: "customer", entityId: id, payload: { name, phone, debtLimit, debtDays } });
    return { ok: true as const };
  }

  const newId = nanoid();
  database.prepare("INSERT INTO customers (id, name, phone, debt_limit, debt_days) VALUES (?, ?, ?, ?, ?)").run(newId, name, phone, debtLimit, debtDays);
  logAudit({ userId: user.id, action: "CREATE", entity: "customer", entityId: newId, payload: { name, phone, debtLimit, debtDays } });
  return { ok: true as const };
}

export async function deleteCustomerAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const id = str(formData, "id");
  if (!id) return { ok: false as const, reason: "Нет клиента." };

  const sales = database.prepare("SELECT COUNT(1) as cnt FROM sales WHERE customer_id=?").get(id) as { cnt: number };
  if (sales.cnt > 0) return { ok: false as const, reason: "Нельзя удалить: есть продажи/чеки у клиента." };

  const row = database.prepare("SELECT name, phone FROM customers WHERE id=?").get(id) as { name?: string; phone?: string } | undefined;
  database.prepare("DELETE FROM customers WHERE id=?").run(id);
  logAudit({ userId: user.id, action: "DELETE", entity: "customer", entityId: id, payload: { name: row?.name, phone: row?.phone } });
  return { ok: true as const };
}
