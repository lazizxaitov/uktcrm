"use server";

import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";

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
    return { ok: true as const };
  }

  const newId = nanoid();
  database
    .prepare(
      "INSERT INTO products (id, name, sku, barcode, category, box_size, safety_stock, reorder_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(newId, name, sku, barcode, category, boxSizeVal, safetyStock, reorderPoint);
  return { ok: true as const };
}

