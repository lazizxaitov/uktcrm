"use server";

import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function upsertProductAction(formData: FormData) {
  const database = db();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const sku = str(formData, "sku");
  const barcode = str(formData, "barcode") || null;
  const category = str(formData, "category") || null;
  const boxSize = str(formData, "box_size");
  const safetyStock = str(formData, "safety_stock") || "0";
  const reorderPoint = str(formData, "reorder_point") || "0";

  if (!name || !sku) return { ok: false as const };

  const boxSizeVal = boxSize ? Number(boxSize) : null;
  if (boxSize && (!Number.isFinite(boxSizeVal) || boxSizeVal! <= 0)) return { ok: false as const };

  if (id) {
    database
      .prepare(
        "UPDATE products SET name=?, sku=?, barcode=?, category=?, box_size=?, safety_stock=?, reorder_point=? WHERE id=?",
      )
      .run(name, sku, barcode, category, boxSizeVal, safetyStock, reorderPoint, id);
    return { ok: true as const, product: { id, name, sku } };
  }

  const newId = nanoid();
  database
    .prepare(
      "INSERT INTO products (id, name, sku, barcode, category, box_size, safety_stock, reorder_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(newId, name, sku, barcode, category, boxSizeVal, safetyStock, reorderPoint);
  return { ok: true as const, product: { id: newId, name, sku } };
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const id = str(formData, "id");
  if (!id) return { ok: false as const, reason: "Нет товара." };

  const batches = database.prepare("SELECT COUNT(1) as cnt FROM stock_batches WHERE product_id=?").get(id) as { cnt: number };
  const saleItems = database.prepare("SELECT COUNT(1) as cnt FROM sale_items WHERE product_id=?").get(id) as { cnt: number };
  if (batches.cnt > 0 || saleItems.cnt > 0) {
    return { ok: false as const, reason: "Нельзя удалить: есть движения по складу или продажи." };
  }

  const row = database.prepare("SELECT name, sku FROM products WHERE id=?").get(id) as { name?: string; sku?: string } | undefined;
  database.prepare("DELETE FROM products WHERE id=?").run(id);
  logAudit({ userId: user.id, action: "DELETE", entity: "product", entityId: id, payload: { name: row?.name, sku: row?.sku } });
  return { ok: true as const };
}
