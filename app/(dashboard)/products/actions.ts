"use server";

import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function genSkuRaw() {
  return `SKU-${nanoid(8).replace(/[-_]/g, "").toUpperCase()}`;
}

function generateUniqueSku(database: ReturnType<typeof db>) {
  for (let i = 0; i < 12; i++) {
    const sku = genSkuRaw();
    const exists = database.prepare("SELECT 1 FROM products WHERE sku=?").get(sku);
    if (!exists) return sku;
  }
  return null;
}

export async function upsertProductAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const skuInput = str(formData, "sku");
  const barcode = str(formData, "barcode") || null;
  const categoryId = str(formData, "category_id") || null;
  const boxSize = str(formData, "box_size");
  const safetyStock = str(formData, "safety_stock") || "0";
  const reorderPoint = str(formData, "reorder_point") || "0";

  if (!name) return { ok: false as const };

  const sku = skuInput || generateUniqueSku(database);
  if (!sku) return { ok: false as const };

  const boxSizeVal = boxSize ? Number(boxSize) : null;
  if (boxSize && (!Number.isFinite(boxSizeVal) || boxSizeVal! <= 0)) return { ok: false as const };

  const catName = categoryId
    ? ((database.prepare("SELECT name FROM categories WHERE id=?").get(categoryId) as { name?: string } | undefined)?.name ?? null)
    : null;

  if (id) {
    database
      .prepare(
        "UPDATE products SET name=?, sku=?, barcode=?, category=?, category_id=?, box_size=?, safety_stock=?, reorder_point=? WHERE id=?",
      )
      .run(name, sku, barcode, catName, categoryId, boxSizeVal, safetyStock, reorderPoint, id);
    logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "product",
      entityId: id,
      payload: { name, sku, barcode, categoryId, boxSizeVal, safetyStock, reorderPoint },
    });
    return { ok: true as const, product: { id, name, sku } };
  }

  const newId = nanoid();
  database
    .prepare(
      "INSERT INTO products (id, name, sku, barcode, category, category_id, box_size, safety_stock, reorder_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(newId, name, sku, barcode, catName, categoryId, boxSizeVal, safetyStock, reorderPoint);
  logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "product",
    entityId: newId,
    payload: { name, sku, barcode, categoryId, boxSizeVal, safetyStock, reorderPoint },
  });
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

export async function createCategoryAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "Admin") return { ok: false as const };
  const database = db();
  const name = str(formData, "name");
  if (!name) return { ok: false as const };
  const id = `cat_${nanoid()}`;
  try {
    database.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run(id, name);
  } catch {
    return { ok: false as const };
  }
  logAudit({ userId: user.id, action: "CREATE", entity: "category", entityId: id, payload: { name } });
  return { ok: true as const };
}

export async function renameCategoryAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "Admin") return { ok: false as const };
  const database = db();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) return { ok: false as const };
  try {
    database.prepare("UPDATE categories SET name=? WHERE id=?").run(name, id);
    database.prepare("UPDATE products SET category=? WHERE category_id=?").run(name, id);
  } catch {
    return { ok: false as const };
  }
  logAudit({ userId: user.id, action: "UPDATE", entity: "category", entityId: id, payload: { name } });
  return { ok: true as const };
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "Admin") return { ok: false as const };
  const database = db();
  const id = str(formData, "id");
  if (!id) return { ok: false as const };
  const used = database.prepare("SELECT COUNT(1) as cnt FROM products WHERE category_id=?").get(id) as { cnt: number };
  if (used.cnt > 0) return { ok: false as const, reason: "Нельзя удалить: есть товары в этой категории." };
  const row = database.prepare("SELECT name FROM categories WHERE id=?").get(id) as { name?: string } | undefined;
  database.prepare("DELETE FROM categories WHERE id=?").run(id);
  logAudit({ userId: user.id, action: "DELETE", entity: "category", entityId: id, payload: { name: row?.name } });
  return { ok: true as const };
}
