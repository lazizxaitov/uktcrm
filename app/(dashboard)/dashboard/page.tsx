import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import { getBusinessNow } from "@/lib/time/server";
import { getSettings } from "@/lib/settings/server";

export const metadata = {
  title: "Панель • UKT CRM",
};

function Widget(props: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500">{props.title}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs text-zinc-500">{props.hint}</div> : null}
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{props.children}</div>
    </div>
  );
}

export default function DashboardPage() {
  migrate();
  const database = db();
  const bizNow = getBusinessNow();
  const bizNowIso = bizNow.toISOString();
  const bizYmd = bizNowIso.slice(0, 10);
  const settings = getSettings();
  const fx = Number(settings.fxUsdUzs) || 12500;
  const products = database.prepare("SELECT COUNT(1) as cnt FROM products").get() as { cnt: number };
  const customers = database.prepare("SELECT COUNT(1) as cnt FROM customers").get() as { cnt: number };
  const salesToday = database
    .prepare("SELECT COUNT(1) as cnt FROM sales WHERE date(created_at)=date(?)")
    .get(bizYmd) as { cnt: number };
  const sumToday = database
    .prepare("SELECT COALESCE(SUM(CAST(total as REAL)),0) as sum FROM sales WHERE status='CLOSED' AND date(created_at)=date(?)")
    .get(bizYmd) as { sum: number };

  const soonOut = database
    .prepare(
      `
      SELECT p.name, p.sku,
             COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand,
             CAST(p.safety_stock as REAL) as safety
      FROM products p
      LEFT JOIN stock_batches b ON b.product_id = p.id
      GROUP BY p.id
      HAVING onhand <= safety AND safety > 0
      ORDER BY (safety - onhand) DESC
      LIMIT 8
    `,
    )
    .all() as Array<{ name: string; sku: string; onhand: number; safety: number }>;

  const reorderHint = database
    .prepare(
      `
      SELECT p.name, p.sku,
             COALESCE(SUM(CAST(b.qty_remaining as REAL)),0) as onhand,
             CAST(p.reorder_point as REAL) as rp
      FROM products p
      LEFT JOIN stock_batches b ON b.product_id = p.id
      GROUP BY p.id
      HAVING onhand <= rp AND rp > 0
      ORDER BY (rp - onhand) DESC
      LIMIT 8
    `,
    )
    .all() as Array<{ name: string; sku: string; onhand: number; rp: number }>;

  const deadStock = database
    .prepare(
      `
      WITH onhand AS (
        SELECT product_id, COALESCE(SUM(CAST(qty_remaining as REAL)),0) as onhand
        FROM stock_batches
        GROUP BY product_id
      ),
      last_sale AS (
        SELECT si.product_id as product_id, MAX(datetime(s.closed_at)) as last_closed
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL
        GROUP BY si.product_id
      )
      SELECT p.name, p.sku,
             COALESCE(o.onhand,0) as onhand,
             ls.last_closed as last_closed
      FROM products p
      LEFT JOIN onhand o ON o.product_id = p.id
      LEFT JOIN last_sale ls ON ls.product_id = p.id
      WHERE COALESCE(o.onhand,0) > 0
      ORDER BY CASE WHEN ls.last_closed IS NULL THEN 999999 ELSE CAST((julianday(?) - julianday(ls.last_closed)) as INTEGER) END DESC
      LIMIT 10
    `,
    )
    .all(bizNowIso) as Array<{ name: string; sku: string; onhand: number; last_closed: string | null }>;

  const forecastRow30 = database
    .prepare(
      `
      SELECT
        COUNT(1) as checks,
        COALESCE(SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)),0) as revenue_uzs
      FROM sales
      WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) >= datetime(?, '-30 days')
    `,
    )
    .get(fx, bizNowIso) as { checks: number; revenue_uzs: number };
  const avgDay30 = forecastRow30.revenue_uzs / 30;
  const forecast7 = avgDay30 * 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Панель</h1>
        <div className="mt-1 text-sm text-zinc-500">Сводка по продажам и базе.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Widget title="Товары" value={String(products.cnt)} />
        <Widget title="Клиенты" value={String(customers.cnt)} />
        <Widget title="Продажи сегодня" value={String(salesToday.cnt)} />
        <Widget title="Сумма (примерно)" value={sumToday.sum.toFixed(2)} hint="Сумма за сегодня." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="AI: Скоро закончатся (Safety stock)">
          {soonOut.length === 0 ? (
            <div className="text-zinc-500">Нет рисков</div>
          ) : (
            <ul className="space-y-1">
              {soonOut.map((r) => (
                <li key={r.sku} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {r.name} <span className="text-xs text-zinc-400">({r.sku})</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {r.onhand.toFixed(0)} / {r.safety.toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="AI: Подсказка по заказу (Reorder point)">
          {reorderHint.length === 0 ? (
            <div className="text-zinc-500">Всё в норме</div>
          ) : (
            <ul className="space-y-1">
              {reorderHint.map((r) => (
                <li key={r.sku} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {r.name} <span className="text-xs text-zinc-400">({r.sku})</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {r.onhand.toFixed(0)} / {r.rp.toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="AI: Неликвид (30/60/90 дней)">
          {deadStock.length === 0 ? (
            <div className="text-zinc-500">Нет данных</div>
          ) : (
            <ul className="space-y-1">
              {deadStock.map((r) => {
                const days = r.last_closed ? Math.max(0, Math.floor((bizNow.getTime() - new Date(r.last_closed).getTime()) / 86400000)) : 999;
                const badge =
                  days >= 90 ? "90+" : days >= 60 ? "60+" : days >= 30 ? "30+" : String(days);
                return (
                  <li key={r.sku} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {r.name} <span className="text-xs text-zinc-400">({r.sku})</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] badge-brand">{badge} дн</span>
                      <span className="text-xs text-zinc-500">{r.onhand.toFixed(0)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="AI: Прогноз выручки (UZS)">
          {forecastRow30.revenue_uzs <= 0 ? (
            <div className="text-zinc-500">Нет продаж за 30 дней</div>
          ) : (
            <div className="space-y-1">
              <div>
                Среднее в день (30 дней): <span className="font-medium">{avgDay30.toFixed(0)}</span>
              </div>
              <div>
                Прогноз на 7 дней: <span className="font-medium">{forecast7.toFixed(0)}</span>
              </div>
              <div className="text-xs text-zinc-500">Считается по закрытым чекам, USD конвертируется по курсу чека.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
