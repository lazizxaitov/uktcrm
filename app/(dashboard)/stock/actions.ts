"use server";

import { nanoid } from "nanoid";
import { db } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";
import { getSettings } from "@/lib/settings/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function addStockBatchAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const settings = getSettings();

  const productId = str(formData, "product_id");
  const qty = str(formData, "qty");
  const cost = str(formData, "cost");
  const currency = (str(formData, "currency") || "UZS").toUpperCase();

  if (!productId || !qty || !cost) return { ok: false as const };
  if (currency !== "UZS" && currency !== "USD") return { ok: false as const };

  const fxRate = currency === "USD" ? settings.fxUsdUzs : null;
  const id = nanoid();
  database
    .prepare(
      "INSERT INTO stock_batches (id, product_id, qty_initial, qty_remaining, cost, currency, fx_rate) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, productId, qty, qty, cost, currency, fxRate);

  logAudit({ userId: user.id, action: "CREATE", entity: "stock_batch", entityId: id, payload: { productId, qty, cost, currency, fxRate } });
  return { ok: true as const };
}

