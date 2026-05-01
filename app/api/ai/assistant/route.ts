import { requireUserForRoute } from "@/lib/auth/route";
import { db } from "@/lib/db/db";
import { getSettings } from "@/lib/settings/server";
import { getBusinessNow } from "@/lib/time/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (text.includes("быстр") && (text.includes("заканч") || text.includes("тогай") || text.includes("tug"))) return "runout_soon";
  if (text.includes("медлен") || text.includes("сек") || text.includes("sekin")) return "slow_sellers_30d";
  if (text.includes("клиент") && (text.includes("прос") || text.includes("упал") || text.includes("pas"))) return "customers_down_30d";
  if (text.includes("прогноз") || text.includes("forecast") || text.includes("prognoz")) return "sales_forecast";
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
  const bizNow = getBusinessNow();
  const nowIso = bizNow.toISOString();
  const from30Iso = new Date(bizNow.getTime() - 30 * 86400000).toISOString();
  const from60Iso = new Date(bizNow.getTime() - 60 * 86400000).toISOString();
  const from7Iso = new Date(bizNow.getTime() - 7 * 86400000).toISOString();
  const from14Iso = new Date(bizNow.getTime() - 14 * 86400000).toISOString();
  const startOfDay = new Date(bizNow);
  startOfDay.setHours(0, 0, 0, 0);
  const fromTodayIso = startOfDay.toISOString();

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

    if (type === "runout_soon") {
      const rows = database
        .prepare(
          `
          WITH sales30 AS (
            SELECT si.product_id as product_id,
                   SUM(CAST(si.qty as REAL)) as sold30
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?)
            GROUP BY si.product_id
          ),
          onhand AS (
            SELECT b.product_id as product_id,
                   COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand
            FROM stock_batches b
            GROUP BY b.product_id
          )
          SELECT p.name, p.sku,
                 COALESCE(o.onhand,0) as onhand,
                 COALESCE(s30.sold30,0) as sold30
          FROM products p
          LEFT JOIN onhand o ON o.product_id = p.id
          LEFT JOIN sales30 s30 ON s30.product_id = p.id
          WHERE COALESCE(o.onhand,0) > 0 AND COALESCE(s30.sold30,0) > 0
          ORDER BY (COALESCE(o.onhand,0) / (COALESCE(s30.sold30,0) / 30.0)) ASC
          LIMIT 12
        `,
        )
        .all(from30Iso) as Array<{ name: string; sku: string; onhand: number; sold30: number }>;

      const enriched = rows
        .map((r) => {
          const ratePerDay = n2(r.sold30) / 30;
          const days = ratePerDay > 0 ? n2(r.onhand) / ratePerDay : Infinity;
          return { ...r, days };
        })
        .filter((r) => Number.isFinite(r.days))
        .sort((a, b) => a.days - b.days)
        .slice(0, 12);

      if (enriched.length === 0) {
        return Response.json({
          ok: true,
          title: "Какие товары скоро закончатся",
          text: "Недостаточно данных: нужен остаток на складе и продажи за 30 дней.",
        });
      }

      const text =
        enriched
          .map((r, i) => `${i + 1}. ${r.name} (${r.sku}) — остаток ${fmtNum(r.onhand)} • хватит примерно на ${fmtNum(r.days)} дн.`)
          .join("\n") + "\n\nРасчёт: остаток / средние продажи в день (за 30 дней).";
      return Response.json({ ok: true, title: "Какие товары скоро закончатся", text });
    }

    if (type === "slow_sellers_30d") {
      const rows = database
        .prepare(
          `
          WITH sales30 AS (
            SELECT si.product_id as product_id,
                   SUM(CAST(si.qty as REAL)) as sold30
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?)
            GROUP BY si.product_id
          ),
          onhand AS (
            SELECT b.product_id as product_id,
                   COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand
            FROM stock_batches b
            GROUP BY b.product_id
          )
          SELECT p.name, p.sku,
                 COALESCE(o.onhand,0) as onhand,
                 COALESCE(s30.sold30,0) as sold30
          FROM products p
          LEFT JOIN onhand o ON o.product_id = p.id
          LEFT JOIN sales30 s30 ON s30.product_id = p.id
          WHERE COALESCE(o.onhand,0) > 0
          ORDER BY COALESCE(s30.sold30,0) ASC, COALESCE(o.onhand,0) DESC
          LIMIT 15
        `,
        )
        .all(from30Iso) as Array<{ name: string; sku: string; onhand: number; sold30: number }>;

      if (rows.length === 0) {
        return Response.json({ ok: true, title: "Какие товары медленно продаются", text: "Нет данных по складу." });
      }

      const text =
        rows
          .map((r, i) => {
            const ratePerDay = n2(r.sold30) / 30;
            const daysSupply = ratePerDay > 0 ? n2(r.onhand) / ratePerDay : Infinity;
            const extra = Number.isFinite(daysSupply) ? ` • запас ~${fmtNum(daysSupply)} дн.` : " • продаж нет (30 дней)";
            return `${i + 1}. ${r.name} (${r.sku}) — остаток ${fmtNum(r.onhand)} • продажи 30д: ${fmtNum(r.sold30)}${extra}`;
          })
          .join("\n") + "\n\nРекомендация: промо/скидка или уменьшить закуп.";
      return Response.json({ ok: true, title: "Какие товары медленно продаются", text });
    }

    if (type === "customers_down_30d") {
      const rows = database
        .prepare(
          `
          WITH s_norm AS (
            SELECT
              s.customer_id as customer_id,
              datetime(s.closed_at) as closed_at,
              CAST(s.total as REAL) * (CASE WHEN s.currency='USD' THEN COALESCE(CAST(s.fx_rate_used as REAL), ?) ELSE 1 END) as total_uzs
            FROM sales s
            WHERE s.status='CLOSED' AND s.customer_id IS NOT NULL AND s.closed_at IS NOT NULL
          ),
          cur AS (
            SELECT customer_id, SUM(total_uzs) as cur_uzs
            FROM s_norm
            WHERE datetime(closed_at) >= datetime(?)
            GROUP BY customer_id
          ),
          prev AS (
            SELECT customer_id, SUM(total_uzs) as prev_uzs
            FROM s_norm
            WHERE datetime(closed_at) < datetime(?) AND datetime(closed_at) >= datetime(?)
            GROUP BY customer_id
          )
          SELECT c.name as name,
                 cur.cur_uzs as cur_uzs,
                 prev.prev_uzs as prev_uzs
          FROM cur
          JOIN prev ON prev.customer_id = cur.customer_id
          JOIN customers c ON c.id = cur.customer_id
          WHERE (cur.cur_uzs - prev.prev_uzs) < 0
          ORDER BY (cur.cur_uzs - prev.prev_uzs) ASC
          LIMIT 10
        `,
        )
        .all(fx, from30Iso, from30Iso, from60Iso) as Array<{ name: string; cur_uzs: number; prev_uzs: number }>;

      if (rows.length === 0) {
        return Response.json({
          ok: true,
          title: "Какие клиенты просели",
          text: "Нет клиентов со снижением выручки (30 дней) относительно предыдущих 30 дней.",
        });
      }

      const text =
        rows
          .map((r, i) => {
            const cur = n2(r.cur_uzs);
            const prev = n2(r.prev_uzs);
            const delta = cur - prev;
            const pct = prev > 0 ? (delta / prev) * 100 : 0;
            return `${i + 1}. ${r.name} — было ${fmtMoneyUzs(prev)}, стало ${fmtMoneyUzs(cur)} (${fmtNum(pct)}%)`;
          })
          .join("\n") + "\n\nПериоды: последние 30 дней vs предыдущие 30 дней.";
      return Response.json({ ok: true, title: "Какие клиенты просели", text });
    }

    if (type === "sales_forecast") {
      const row30 = database
        .prepare(
          `
          SELECT
            COUNT(1) as checks,
            SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs
          FROM sales
          WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) >= datetime(?)
        `,
        )
        .get(fx, from30Iso) as { checks: number; revenue_uzs: number | null };
      const row7 = database
        .prepare(
          `
          SELECT
            COUNT(1) as checks,
            SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs
          FROM sales
          WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) >= datetime(?)
        `,
        )
        .get(fx, from7Iso) as { checks: number; revenue_uzs: number | null };
      const rowPrev7 = database
        .prepare(
          `
          SELECT
            COUNT(1) as checks,
            SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs
          FROM sales
          WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) < datetime(?) AND datetime(closed_at) >= datetime(?)
        `,
        )
        .get(fx, from7Iso, from14Iso) as { checks: number; revenue_uzs: number | null };

      const rev30 = n2(row30.revenue_uzs);
      const rev7 = n2(row7.revenue_uzs);
      const revPrev7 = n2(rowPrev7.revenue_uzs);
      const avgDay30 = rev30 / 30;
      const forecast7 = avgDay30 * 7;
      const trendPct = revPrev7 > 0 ? ((rev7 - revPrev7) / revPrev7) * 100 : 0;
      const avgChecks30 = n2(row30.checks) / 30;
      const forecastChecks7 = Math.round(avgChecks30 * 7);

      if (rev30 <= 0) {
        return Response.json({ ok: true, title: "Прогноз продаж", text: "Нет продаж за последние 30 дней — прогноз построить нельзя." });
      }

      return Response.json({
        ok: true,
        title: "Прогноз продаж",
        text:
          `Средняя выручка в день (30 дней): ${fmtMoneyUzs(avgDay30)}\n` +
          `Прогноз на 7 дней: ${fmtMoneyUzs(forecast7)}\n` +
          `Прогноз по чекам на 7 дней: ~${forecastChecks7}\n` +
          `Тренд (последние 7 дней vs предыдущие 7): ${fmtNum(trendPct)}%`,
      });
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
          WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?)
          GROUP BY p.id
          ORDER BY revenue_uzs DESC
          LIMIT 10
        `,
        )
        .all(fx, from30Iso) as Array<{ name: string; sku: string; qty: number; revenue_uzs: number }>;

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
        ? { title: "Продажи сегодня", fromIso: fromTodayIso }
        : type === "sales_7d"
          ? { title: "Продажи за 7 дней", fromIso: from7Iso }
          : type === "sales_30d" || type === "profit_30d"
            ? { title: type === "profit_30d" ? "Прибыль за 30 дней" : "Продажи за 30 дней", fromIso: from30Iso }
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
        WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) >= datetime(?)
      `,
      )
      .get(fx, fx, range.fromIso) as { checks: number; revenue_uzs: number | null; avg_check_uzs: number | null };

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
          WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?)
        `,
        )
        .get(fx, range.fromIso) as { cost_uzs: number | null };

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
