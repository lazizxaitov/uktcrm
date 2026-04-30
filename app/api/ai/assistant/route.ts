import { requireUserForRoute } from "@/lib/auth/route";
import { db } from "@/lib/db/db";
import { getSettings } from "@/lib/settings/server";

export const dynamic = "force-dynamic";

type ReqBody = { type?: string; text?: string };

function n2(x: unknown) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtMoneyUzs(v: number) {
  const rounded = Math.round(v);
  return rounded.toLocaleString("ru-RU") + " UZS";
}

function fmtNum(v: number) {
  const r = Math.round(v * 100) / 100;
  return r.toLocaleString("ru-RU");
}

function pickType(body: ReqBody): string {
  const t = String(body.type ?? "").trim();
  if (t && t !== "free") return t;
  const text = String(body.text ?? "").toLowerCase();
  if (text.includes("топ") && text.includes("товар")) return "top_products_30d";
  if (text.includes("сегодня") && (text.includes("продаж") || text.includes("выруч"))) return "sales_today";
  if ((text.includes("7") || text.includes("нед")) && (text.includes("продаж") || text.includes("выруч"))) return "sales_7d";
  if ((text.includes("30") || text.includes("месяц")) && (text.includes("продаж") || text.includes("выруч"))) return "sales_30d";
  if (text.includes("приб")) return "profit_30d";
  if (text.includes("склад") || text.includes("заканч")) return "low_stock";
  if (text.includes("стат")) return "system_stats";
  return "help";
}

export async function POST(request: Request) {
  const user = await requireUserForRoute();
  if (!user) return Response.json({ ok: false, error: "NO_AUTH" }, { status: 401 });

  let body: ReqBody = {};
  try {
    body = (await request.json()) as ReqBody;
  } catch {
    body = {};
  }

  const type = pickType(body);
  const database = db();
  const settings = getSettings();
  const fx = n2(settings.fxUsdUzs) || 12500;

  try {
    if (type === "help") {
      return Response.json({
        ok: true,
        title: "Подсказка",
        text:
          "Доступные запросы:\n" +
          "• Топ товары (30 дней)\n" +
          "• Продажи сегодня / 7 дней / 30 дней\n" +
          "• Прибыль (30 дней)\n" +
          "• Товары на исходе\n" +
          "• Статистика системы",
      });
    }

    if (type === "system_stats") {
      const products = database.prepare("SELECT COUNT(1) as cnt FROM products").get() as { cnt: number };
      const customers = database.prepare("SELECT COUNT(1) as cnt FROM customers").get() as { cnt: number };
      const openSales = database.prepare("SELECT COUNT(1) as cnt FROM sales WHERE status='OPEN'").get() as { cnt: number };
      const closedSales = database.prepare("SELECT COUNT(1) as cnt FROM sales WHERE status='CLOSED'").get() as { cnt: number };
      const batches = database.prepare("SELECT COUNT(1) as cnt FROM stock_batches").get() as { cnt: number };
      return Response.json({
        ok: true,
        title: "Статистика системы",
        text:
          `Товары: ${products.cnt}\n` +
          `Клиенты: ${customers.cnt}\n` +
          `Открытые чеки: ${openSales.cnt}\n` +
          `Закрытые чеки: ${closedSales.cnt}\n` +
          `Партии (FIFO): ${batches.cnt}`,
      });
    }

    if (type === "low_stock") {
      const rows = database
        .prepare(
          `
          SELECT p.name, p.sku,
                 CAST(p.safety_stock as REAL) as safety,
                 COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand
          FROM products p
          LEFT JOIN stock_batches b ON b.product_id = p.id
          GROUP BY p.id
          HAVING safety > 0 AND onhand <= safety
          ORDER BY onhand ASC
          LIMIT 12
        `,
        )
        .all() as Array<{ name: string; sku: string; safety: number; onhand: number }>;
      if (rows.length === 0) {
        return Response.json({ ok: true, title: "Товары на исходе", text: "Нет товаров, которые ниже safety stock." });
      }
      const text =
        rows
          .map((r, i) => `${i + 1}. ${r.name} (${r.sku}) — остаток ${fmtNum(r.onhand)} / safety ${fmtNum(r.safety)}`)
          .join("\n") + "\n\nРекомендация: сделайте приход по этим позициям.";
      return Response.json({ ok: true, title: "Товары на исходе", text });
    }

    if (type === "top_products_30d") {
      const rows = database
        .prepare(
          `
          SELECT p.name, p.sku,
                 SUM(CAST(si.qty as REAL)) as qty,
                 SUM(CAST(si.total as REAL) * (CASE WHEN s.currency='USD' THEN COALESCE(CAST(s.fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs
          FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          JOIN products p ON p.id = si.product_id
          WHERE s.status='CLOSED' AND datetime(s.closed_at) >= datetime('now','-30 days')
          GROUP BY p.id
          ORDER BY revenue_uzs DESC
          LIMIT 10
        `,
        )
        .all(fx) as Array<{ name: string; sku: string; qty: number; revenue_uzs: number }>;

      if (rows.length === 0) {
        return Response.json({ ok: true, title: "Топ товары (30 дней)", text: "Нет продаж за последние 30 дней." });
      }
      const text =
        rows
          .map((r, i) => `${i + 1}. ${r.name} (${r.sku}) — ${fmtNum(r.qty)} шт • ${fmtMoneyUzs(n2(r.revenue_uzs))}`)
          .join("\n") + `\n\nКурс для USD → UZS: ${fmtNum(fx)}`;
      return Response.json({ ok: true, title: "Топ товары (30 дней)", text });
    }

    const range =
      type === "sales_today"
        ? { title: "Продажи сегодня", fromSql: "datetime(date('now'))" }
        : type === "sales_7d"
          ? { title: "Продажи за 7 дней", fromSql: "datetime('now','-7 days')" }
          : type === "sales_30d" || type === "profit_30d"
            ? { title: type === "profit_30d" ? "Прибыль за 30 дней" : "Продажи за 30 дней", fromSql: "datetime('now','-30 days')" }
            : null;

    if (!range) return Response.json({ ok: true, title: "AI ассистент", text: "Не понял запрос. Выберите готовый вопрос." });

    const revenueRow = database
      .prepare(
        `
        SELECT
          COUNT(1) as checks,
          SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs,
          AVG(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)) as avg_check_uzs
        FROM sales
        WHERE status='CLOSED' AND datetime(closed_at) >= ${range.fromSql}
      `,
      )
      .get(fx, fx) as { checks: number; revenue_uzs: number | null; avg_check_uzs: number | null };

    const revenueUzs = n2(revenueRow.revenue_uzs);
    const avgUzs = n2(revenueRow.avg_check_uzs);

    if (type === "profit_30d") {
      const costRow = database
        .prepare(
          `
          SELECT
            SUM(CAST(a.qty as REAL) * CAST(a.cost as REAL) * (CASE WHEN a.currency='USD' THEN COALESCE(CAST(a.fx_rate as REAL), ?) ELSE 1 END)) as cost_uzs
          FROM sale_allocations a
          JOIN sale_items si ON si.id = a.sale_item_id
          JOIN sales s ON s.id = si.sale_id
          WHERE s.status='CLOSED' AND datetime(s.closed_at) >= ${range.fromSql}
        `,
        )
        .get(fx) as { cost_uzs: number | null };

      const costUzs = n2(costRow.cost_uzs);
      const profit = revenueUzs - costUzs;
      const margin = revenueUzs > 0 ? (profit / revenueUzs) * 100 : 0;
      return Response.json({
        ok: true,
        title: range.title,
        text:
          `Чеки: ${revenueRow.checks}\n` +
          `Выручка: ${fmtMoneyUzs(revenueUzs)}\n` +
          `Себестоимость: ${fmtMoneyUzs(costUzs)}\n` +
          `Прибыль: ${fmtMoneyUzs(profit)}\n` +
          `Маржа: ${fmtNum(margin)}%`,
      });
    }

    return Response.json({
      ok: true,
      title: range.title,
      text:
        `Чеки: ${revenueRow.checks}\n` +
        `Выручка: ${fmtMoneyUzs(revenueUzs)}\n` +
        `Средний чек: ${fmtMoneyUzs(avgUzs)}\n` +
        `Курс для USD → UZS: ${fmtNum(fx)}`,
    });
  } catch {
    return Response.json({ ok: false, error: "FAIL" }, { status: 500 });
  }
}

