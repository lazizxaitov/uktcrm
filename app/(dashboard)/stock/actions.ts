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

type ReceiptLine = { productId: string; qty: string; cost: string; currency: "UZS" | "USD" };

export async function addStockReceiptAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const settings = getSettings();

  const json = str(formData, "items_json");
  if (!json) return { ok: false as const };

  let lines: ReceiptLine[] = [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return { ok: false as const };
    lines = parsed
      .map((x) => ({
        productId: String((x as any)?.productId ?? "").trim(),
        qty: String((x as any)?.qty ?? "").trim(),
        cost: String((x as any)?.cost ?? "").trim(),
        currency: String((x as any)?.currency ?? "UZS").trim().toUpperCase() as "UZS" | "USD",
      }))
      .filter((l) => l.productId && l.qty && l.cost);
  } catch {
    return { ok: false as const };
  }

  if (lines.length === 0) return { ok: false as const };

  const tx = database.transaction(() => {
    for (const line of lines) {
      if (line.currency !== "UZS" && line.currency !== "USD") throw new Error("BAD_CURRENCY");
      const fxRate = line.currency === "USD" ? settings.fxUsdUzs : null;
      const id = nanoid();
      database
        .prepare(
          "INSERT INTO stock_batches (id, product_id, qty_initial, qty_remaining, cost, currency, fx_rate) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, line.productId, line.qty, line.qty, line.cost, line.currency, fxRate);
    }
  });

  try {
    tx();
  } catch {
    return { ok: false as const };
  }

  logAudit({ userId: user.id, action: "CREATE", entity: "stock_receipt", payload: { linesCount: lines.length } });
  return { ok: true as const };
}
