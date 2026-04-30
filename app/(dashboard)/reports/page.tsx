import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import Decimal from "decimal.js";
import { getSettings } from "@/lib/settings/server";
import DateField from "@/app/components/DateField";

export const metadata = { title: "Отчёты • UKT CRM" };

function parseDate(s: string | undefined, fallback: Date) {
  if (!s) return fallback;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(num: Decimal) {
  return num.toFixed(2);
}

type SalesAggRow = { day: string; cnt: number; revenue_uzs: number; cost_uzs: number };
type ProductAggRow = { product_id: string; name: string; sku: string; revenue_uzs: number; cost_uzs: number; qty: number };

export default async function ReportsPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  migrate();
  const database = db();
  const settings = getSettings();

  const sp = props.searchParams ? await props.searchParams : {};
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const from = parseDate(typeof sp.from === "string" ? sp.from : undefined, defaultFrom);
  const to = parseDate(typeof sp.to === "string" ? sp.to : undefined, now);
  const fromYmd = ymd(from);
  const toYmd = ymd(to);

  const daily = database
    .prepare(
      `
      WITH sales_closed AS (
        SELECT id, currency, COALESCE(fx_rate_used, ?) as fx_used, date(closed_at) as day
        FROM sales
        WHERE status='CLOSED' AND closed_at IS NOT NULL AND date(closed_at) BETWEEN date(?) AND date(?)
      ),
      revenue AS (
        SELECT sc.day as day,
               COUNT(1) as cnt,
               SUM(CASE WHEN sc.currency='USD' THEN CAST(s.total as REAL) * CAST(sc.fx_used as REAL) ELSE CAST(s.total as REAL) END) as revenue_uzs
        FROM sales s
        JOIN sales_closed sc ON sc.id = s.id
        GROUP BY sc.day
      ),
      cost AS (
        SELECT sc.day as day,
               SUM(
                 CASE
                   WHEN a.currency='USD' THEN CAST(a.qty as REAL) * CAST(a.cost as REAL) * CAST(COALESCE(a.fx_rate, ?) as REAL)
                   ELSE CAST(a.qty as REAL) * CAST(a.cost as REAL)
                 END
               ) as cost_uzs
        FROM sale_allocations a
        JOIN sale_items si ON si.id = a.sale_item_id
        JOIN sales_closed sc ON sc.id = si.sale_id
        GROUP BY sc.day
      )
      SELECT r.day as day,
             r.cnt as cnt,
             COALESCE(r.revenue_uzs,0) as revenue_uzs,
             COALESCE(c.cost_uzs,0) as cost_uzs
      FROM revenue r
      LEFT JOIN cost c ON c.day = r.day
      ORDER BY r.day DESC
    `,
    )
    .all(settings.fxUsdUzs, fromYmd, toYmd, settings.fxUsdUzs) as SalesAggRow[];

  const products = database
    .prepare(
      `
      WITH sales_closed AS (
        SELECT id, currency, COALESCE(fx_rate_used, ?) as fx_used
        FROM sales
        WHERE status='CLOSED' AND closed_at IS NOT NULL AND date(closed_at) BETWEEN date(?) AND date(?)
      ),
      item_rev AS (
        SELECT si.product_id as product_id,
               SUM(CASE WHEN sc.currency='USD' THEN CAST(si.total as REAL) * CAST(sc.fx_used as REAL) ELSE CAST(si.total as REAL) END) as revenue_uzs,
               SUM(CAST(si.qty as REAL)) as qty
        FROM sale_items si
        JOIN sales_closed sc ON sc.id = si.sale_id
        GROUP BY si.product_id
      ),
      item_cost AS (
        SELECT si.product_id as product_id,
               SUM(
                 CASE
                   WHEN a.currency='USD' THEN CAST(a.qty as REAL) * CAST(a.cost as REAL) * CAST(COALESCE(a.fx_rate, ?) as REAL)
                   ELSE CAST(a.qty as REAL) * CAST(a.cost as REAL)
                 END
               ) as cost_uzs
        FROM sale_allocations a
        JOIN sale_items si ON si.id = a.sale_item_id
        JOIN sales_closed sc ON sc.id = si.sale_id
        GROUP BY si.product_id
      )
      SELECT p.id as product_id, p.name, p.sku,
             COALESCE(r.revenue_uzs,0) as revenue_uzs,
             COALESCE(c.cost_uzs,0) as cost_uzs,
             COALESCE(r.qty,0) as qty
      FROM products p
      LEFT JOIN item_rev r ON r.product_id = p.id
      LEFT JOIN item_cost c ON c.product_id = p.id
      WHERE COALESCE(r.revenue_uzs,0) > 0
      ORDER BY r.revenue_uzs DESC
      LIMIT 200
    `,
    )
    .all(settings.fxUsdUzs, fromYmd, toYmd, settings.fxUsdUzs) as ProductAggRow[];

  const totalRevenue = products.reduce((acc, p) => acc.add(new Decimal(p.revenue_uzs)), new Decimal(0));
  const abc = (() => {
    let cum = new Decimal(0);
    return products.map((p) => {
      const rev = new Decimal(p.revenue_uzs);
      const share = totalRevenue.gt(0) ? rev.div(totalRevenue) : new Decimal(0);
      cum = cum.add(share);
      const cumPct = cum.mul(100);
      const cls = cumPct.lte(80) ? "A" : cumPct.lte(95) ? "B" : "C";
      return { ...p, cumPct, cls };
    });
  })();

  const xyz = (() => {
    const rows = database
      .prepare(
        `
        WITH sales_closed AS (
          SELECT id
          FROM sales
          WHERE status='CLOSED' AND closed_at IS NOT NULL AND date(closed_at) BETWEEN date(?) AND date(?)
        )
        SELECT si.product_id as product_id, date(s.closed_at) as day, SUM(CAST(si.qty as REAL)) as qty
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN sales_closed sc ON sc.id = s.id
        GROUP BY si.product_id, day
      `,
      )
      .all(fromYmd, toYmd) as Array<{ product_id: string; day: string; qty: number }>;

    const byProduct = new Map<string, number[]>();
    for (const r of rows) {
      const arr = byProduct.get(r.product_id) ?? [];
      arr.push(r.qty);
      byProduct.set(r.product_id, arr);
    }

    const out = products.map((p) => {
      const arr = byProduct.get(p.product_id) ?? [];
      const n = arr.length;
      const mean = n ? arr.reduce((a, b) => a + b, 0) / n : 0;
      const variance = n ? arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n : 0;
      const std = Math.sqrt(variance);
      const cv = mean > 0 ? std / mean : 999;
      const cls = cv <= 0.1 ? "X" : cv <= 0.25 ? "Y" : "Z";
      return { product_id: p.product_id, cls };
    });

    return new Map(out.map((o) => [o.product_id, o]));
  })();

  return (
    <div>
      <h1 className="text-xl font-semibold">Отчёты</h1>
      <div className="mt-1 text-sm text-zinc-500">Выручка, прибыль, ABC/XYZ анализ.</div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <form className="flex flex-wrap items-end gap-3" action="/reports">
          <div>
            <label className="block text-xs font-medium text-zinc-600">С</label>
            <DateField name="from" defaultValue={fromYmd} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">По</label>
            <DateField name="to" defaultValue={toYmd} />
          </div>
          <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium btn-primary">
            Показать
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-4 py-3 text-sm font-semibold">По дням (UZS)</div>
          <div className="border-t border-zinc-200 dark:border-zinc-800" />
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">День</th>
                  <th className="px-4 py-3 text-right font-medium">Чеков</th>
                  <th className="px-4 py-3 text-right font-medium">Выручка</th>
                  <th className="px-4 py-3 text-right font-medium">Себестоимость</th>
                  <th className="px-4 py-3 text-right font-medium">Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  daily.map((r) => {
                    const rev = new Decimal(r.revenue_uzs);
                    const cost = new Decimal(r.cost_uzs);
                    const profit = rev.sub(cost);
                    return (
                      <tr key={r.day} className="border-t border-zinc-100 dark:border-zinc-900">
                        <td className="px-4 py-3">{r.day}</td>
                        <td className="px-4 py-3 text-right text-zinc-600">{r.cnt}</td>
                        <td className="px-4 py-3 text-right">{money(rev)}</td>
                        <td className="px-4 py-3 text-right text-zinc-600">{money(cost)}</td>
                        <td className="px-4 py-3 text-right font-medium">{money(profit)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-4 py-3 text-sm font-semibold">Топ товаров (UZS)</div>
          <div className="border-t border-zinc-200 dark:border-zinc-800" />
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Товар</th>
                  <th className="px-4 py-3 text-right font-medium">Выручка</th>
                  <th className="px-4 py-3 text-right font-medium">Прибыль</th>
                  <th className="px-4 py-3 text-center font-medium">ABC</th>
                  <th className="px-4 py-3 text-center font-medium">XYZ</th>
                </tr>
              </thead>
              <tbody>
                {abc.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                      Нет продаж
                    </td>
                  </tr>
                ) : (
                  abc.slice(0, 50).map((p) => {
                    const rev = new Decimal(p.revenue_uzs);
                    const cost = new Decimal(p.cost_uzs);
                    const profit = rev.sub(cost);
                    const xyzRow = xyz.get(p.product_id);
                    return (
                      <tr key={p.product_id} className="border-t border-zinc-100 dark:border-zinc-900">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-zinc-500">{p.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{money(rev)}</td>
                        <td className="px-4 py-3 text-right font-medium">{money(profit)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full px-2 py-1 text-xs badge-brand">{p.cls}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full px-2 py-1 text-xs badge-brand">{xyzRow?.cls ?? "—"}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
            Конвертация: выручка по курсу чека (`fx_rate_used`), себестоимость по курсу партии (`fx_rate`).
          </div>
        </div>
      </div>
    </div>
  );
}
