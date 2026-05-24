"use server";

import { nanoid } from "nanoid";
import { db } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";
import { getSettings } from "@/lib/settings/server";
import { d, s } from "@/lib/money/decimal";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function openSaleAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const customerId = str(formData, "customer_id") || null;
  const currency = (str(formData, "currency") || "UZS").toUpperCase();
  if (currency !== "UZS" && currency !== "USD") return { ok: false as const };

  const id = nanoid();
  database.prepare("INSERT INTO sales (id, customer_id, status, currency) VALUES (?, ?, 'OPEN', ?)").run(id, customerId, currency);
  logAudit({ userId: user.id, action: "CREATE", entity: "sale", entityId: id, payload: { customerId, currency } });
  return { ok: true as const, id };
}

type CreateSaleItem = { productId: string; qty: string; price: string };

export async function createSaleWithItemsAction(formData: FormData) {
  const user = await requireUser();
  const database = db();

  const customerId = str(formData, "customer_id") || null;
  const currency = (str(formData, "currency") || "UZS").toUpperCase();
  if (currency !== "UZS" && currency !== "USD") return { ok: false as const };

  const createdAtRaw = str(formData, "created_at") || null;
  const createdAt = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw)) ? new Date(createdAtRaw).toISOString() : null;

  const json = str(formData, "items_json");
  if (!json) return { ok: false as const };
  let items: CreateSaleItem[] = [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return { ok: false as const };
    items = (parsed as any[])
      .map((x) => ({
        productId: String(x?.productId ?? "").trim(),
        qty: String(x?.qty ?? "").trim(),
        price: String(x?.price ?? "").trim(),
      }))
      .filter((x) => x.productId && x.qty && x.price);
  } catch {
    return { ok: false as const };
  }
  if (items.length === 0) return { ok: false as const };

  const id = nanoid();
  const tx = database.transaction(() => {
    if (createdAt) database.prepare("INSERT INTO sales (id, customer_id, status, currency, created_at) VALUES (?, ?, 'OPEN', ?, ?)").run(id, customerId, currency, createdAt);
    else database.prepare("INSERT INTO sales (id, customer_id, status, currency) VALUES (?, ?, 'OPEN', ?)").run(id, customerId, currency);

    for (const it of items) {
      const qty = d(it.qty);
      const price = d(it.price);
      if (qty.lte(0) || price.lt(0)) throw new Error("BAD_ITEM");
      const total = qty.mul(price);
      const itemId = nanoid();
      database.prepare("INSERT INTO sale_items (id, sale_id, product_id, qty, price, total) VALUES (?, ?, ?, ?, ?, ?)").run(
        itemId,
        id,
        it.productId,
        s(qty, 3),
        s(price, 2),
        s(total, 2),
      );
    }
  });

  try {
    tx();
  } catch {
    return { ok: false as const };
  }

  logAudit({ userId: user.id, action: "CREATE", entity: "sale", entityId: id, payload: { customerId, currency, itemsCount: items.length } });
  return { ok: true as const, id };
}

export async function addSaleItemAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const saleId = str(formData, "sale_id");
  const productId = str(formData, "product_id");
  const qty = d(str(formData, "qty"));
  const price = d(str(formData, "price"));
  if (!saleId || !productId) return { ok: false as const };
  if (qty.lte(0) || price.lt(0)) return { ok: false as const };

  const sale = database.prepare("SELECT id, status FROM sales WHERE id=?").get(saleId) as { id: string; status: string } | undefined;
  if (!sale || sale.status !== "OPEN") return { ok: false as const };

  const total = qty.mul(price);
  const id = nanoid();
  database.prepare("INSERT INTO sale_items (id, sale_id, product_id, qty, price, total) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    saleId,
    productId,
    s(qty, 3),
    s(price, 2),
    s(total, 2),
  );

  logAudit({ userId: user.id, action: "CREATE", entity: "sale_item", entityId: id, payload: { saleId, productId, qty: s(qty, 3), price: s(price, 2) } });
  return { ok: true as const };
}

export async function removeSaleItemAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const id = str(formData, "id");
  if (!id) return { ok: false as const };
  const row = database.prepare("SELECT sale_id FROM sale_items WHERE id=?").get(id) as { sale_id: string } | undefined;
  if (!row) return { ok: false as const };
  const sale = database.prepare("SELECT status FROM sales WHERE id=?").get(row.sale_id) as { status: string } | undefined;
  if (!sale || sale.status !== "OPEN") return { ok: false as const };
  database.prepare("DELETE FROM sale_items WHERE id=?").run(id);
  logAudit({ userId: user.id, action: "DELETE", entity: "sale_item", entityId: id });
  return { ok: true as const };
}

export async function closeSaleAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const settings = getSettings();

  const saleId = str(formData, "sale_id");
  const cash = d(str(formData, "cash"));
  const card = d(str(formData, "card"));
  if (!saleId) return { ok: false as const, error: "NO_ID" as const };
  if (cash.lt(0) || card.lt(0)) return { ok: false as const, error: "PAYMENT" as const };

  const sale = database.prepare("SELECT id, status, currency, customer_id FROM sales WHERE id=?").get(saleId) as
    | { id: string; status: string; currency: string; customer_id: string | null }
    | undefined;
  if (!sale || sale.status !== "OPEN") return { ok: false as const, error: "STATUS" as const };

  const items = database
    .prepare("SELECT id, product_id, qty, price, total FROM sale_items WHERE sale_id=? ORDER BY created_at ASC")
    .all(saleId) as Array<{ id: string; product_id: string; qty: string; price: string; total: string }>;
  if (items.length === 0) return { ok: false as const, error: "EMPTY" as const };

  const total = items.reduce((acc, it) => acc.add(d(it.total)), d(0));
  const paid = cash.add(card);

  const tx = database.transaction(() => {
    // FIFO allocation (simple, single-warehouse)
    const touchedProductIds = new Set<string>();
    for (const it of items) {
      touchedProductIds.add(it.product_id);
      let need = d(it.qty);
      const batches = database
        .prepare("SELECT id, qty_remaining, cost, currency, fx_rate FROM stock_batches WHERE product_id=? AND CAST(qty_remaining as REAL) > 0 ORDER BY datetime(created_at) ASC")
        .all(it.product_id) as Array<{ id: string; qty_remaining: string; cost: string; currency: string; fx_rate: string | null }>;

      for (const b of batches) {
        if (need.lte(0)) break;
        const rem = d(b.qty_remaining);
        if (rem.lte(0)) continue;
        const take = DecimalMin(rem, need);

        const newRem = rem.sub(take);
        database.prepare("UPDATE stock_batches SET qty_remaining=? WHERE id=?").run(s(newRem, 3), b.id);
        database
          .prepare("INSERT INTO sale_allocations (id, sale_item_id, batch_id, qty, cost, currency, fx_rate) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(nanoid(), it.id, b.id, s(take, 3), b.cost, b.currency, b.fx_rate);

        need = need.sub(take);
      }
      if (need.gt(0)) {
        throw new Error("NO_STOCK");
      }
    }

    // payments
    const method =
      cash.gt(0) && card.gt(0) ? "MIX" : cash.gt(0) ? "CASH" : card.gt(0) ? "CARD" : "CASH";
    if (cash.gt(0)) {
      database.prepare("INSERT INTO payments (id, sale_id, method, currency, amount) VALUES (?, ?, 'CASH', ?, ?)").run(nanoid(), saleId, sale.currency, s(cash, 2));
    }
    if (card.gt(0)) {
      database.prepare("INSERT INTO payments (id, sale_id, method, currency, amount) VALUES (?, ?, 'CARD', ?, ?)").run(nanoid(), saleId, sale.currency, s(card, 2));
    }

    let depositDelta = d(0);
    let sellerDelta = d(0);
    const over = paid.sub(total);
    if (over.gt(0)) {
      const useDeposit = settings.overpayMode === "DEPOSIT" && !!sale.customer_id;
      if (useDeposit) {
        depositDelta = over;
        database.prepare("UPDATE customers SET deposit_balance = CAST(deposit_balance as REAL) + ? WHERE id=?").run(s(over, 2), sale.customer_id);
      } else {
        sellerDelta = over.neg();
        database.prepare("UPDATE users SET seller_balance = CAST(seller_balance as REAL) + ? WHERE id=?").run(s(sellerDelta, 2), user.id);
      }
    }

    const fxUsed = sale.currency === "USD" ? settings.fxUsdUzs : null;
    database
      .prepare("UPDATE sales SET status='CLOSED', fx_rate_used=?, total=?, paid=?, deposit_delta=?, seller_delta=?, closed_at=datetime('now') WHERE id=?")
      .run(fxUsed, s(total, 2), s(paid, 2), s(depositDelta, 2), s(sellerDelta, 2), saleId);

    // notifications: low stock after sale
    for (const productId of touchedProductIds) {
      const info = database
        .prepare(
          `
          SELECT p.name, p.sku, CAST(p.safety_stock as REAL) as safety,
                 COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand
          FROM products p
          LEFT JOIN stock_batches b ON b.product_id = p.id
          WHERE p.id=?
          GROUP BY p.id
        `,
        )
        .get(productId) as { name: string; sku: string; safety: number; onhand: number } | undefined;
      if (!info) continue;
      if (!(info.safety > 0) || !(info.onhand <= info.safety)) continue;

      const exists = database
        .prepare(
          "SELECT COUNT(1) as cnt FROM notifications WHERE is_read=0 AND type='stock' AND message LIKE ?",
        )
        .get(`%${info.sku}%`) as { cnt: number };
      if (exists.cnt > 0) continue;

      database
        .prepare("INSERT INTO notifications (id, type, message) VALUES (?, 'stock', ?)")
        .run(nanoid(), `Товар скоро закончится: ${info.name} (${info.sku}) • Остаток ${Math.floor(info.onhand)} / Safety ${Math.floor(info.safety)}`);
    }

    logAudit({
      userId: user.id,
      action: "CLOSE",
      entity: "sale",
      entityId: saleId,
      payload: { total: s(total, 2), paid: s(paid, 2), method, depositDelta: s(depositDelta, 2), sellerDelta: s(sellerDelta, 2) },
    });
  });

  try {
    tx();
  } catch (e) {
    const msg = String((e as Error)?.message ?? "");
    if (msg === "NO_STOCK") return { ok: false as const, error: "NO_STOCK" as const };
    return { ok: false as const, error: "UNKNOWN" as const };
  }

  return { ok: true as const };
}

export async function refundSaleAction(formData: FormData) {
  const user = await requireUser();
  const database = db();
  const saleId = str(formData, "sale_id");
  if (!saleId) return { ok: false as const };
  const sale = database.prepare("SELECT status FROM sales WHERE id=?").get(saleId) as { status: string } | undefined;
  if (!sale || sale.status !== "CLOSED") return { ok: false as const };

  const tx = database.transaction(() => {
    const allocs = database
      .prepare(
        `
        SELECT a.batch_id, a.qty
        FROM sale_allocations a
        JOIN sale_items si ON si.id = a.sale_item_id
        WHERE si.sale_id = ?
      `,
      )
      .all(saleId) as Array<{ batch_id: string; qty: string }>;

    for (const a of allocs) {
      database
        .prepare("UPDATE stock_batches SET qty_remaining = CAST(qty_remaining as REAL) + ? WHERE id=?")
        .run(a.qty, a.batch_id);
    }

    database.prepare("UPDATE sales SET status='REFUNDED' WHERE id=?").run(saleId);
    database.prepare("INSERT INTO notifications (id, type, message) VALUES (?, 'refund', ?)").run(nanoid(), `Сделан возврат по чеку ${saleId}. Остатки восстановлены.`);
    logAudit({ userId: user.id, action: "REFUND", entity: "sale", entityId: saleId });
  });

  tx();
  return { ok: true as const };
}

function DecimalMin(a: import("decimal.js").Decimal, b: import("decimal.js").Decimal) {
  return a.lte(b) ? a : b;
}
