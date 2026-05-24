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

function fmtInt(n: number) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return v.toLocaleString("ru-RU");
}

function fmtMoneyUzs(n: number) {
  return `${fmtInt(n)} UZS`;
}

function pct(cur: number, prev: number) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
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

  const ymdYesterday = new Date(bizNow.getTime() - 86400000).toISOString().slice(0, 10);
  const sumYesterday = database
    .prepare("SELECT COALESCE(SUM(CAST(total as REAL)),0) as sum FROM sales WHERE status='CLOSED' AND date(created_at)=date(?)")
    .get(ymdYesterday) as { sum: number };

  const revenue7 = database
    .prepare(
      `
      SELECT
        COUNT(1) as checks,
        COALESCE(SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)),0) as revenue_uzs,
        COALESCE(AVG(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)),0) as avg_check_uzs
      FROM sales
      WHERE status='CLOSED' AND closed_at IS NOT NULL AND datetime(closed_at) >= datetime(?, '-7 days')
    `,
    )
    .get(fx, fx, bizNowIso) as { checks: number; revenue_uzs: number; avg_check_uzs: number };

  const revenuePrev7 = database
    .prepare(
      `
      SELECT
        COALESCE(SUM(CAST(total as REAL) * (CASE WHEN currency='USD' THEN COALESCE(CAST(fx_rate_used as REAL), ?) ELSE 1 END)),0) as revenue_uzs
      FROM sales
      WHERE status='CLOSED' AND closed_at IS NOT NULL
        AND datetime(closed_at) < datetime(?, '-7 days')
        AND datetime(closed_at) >= datetime(?, '-14 days')
    `,
    )
    .get(fx, bizNowIso, bizNowIso) as { revenue_uzs: number };

  const revenue30 = database
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

  const cost30 = database
    .prepare(
      `
      SELECT
        COALESCE(SUM(CAST(a.qty as REAL) * CAST(a.cost as REAL) * (CASE WHEN a.currency='USD' THEN COALESCE(CAST(a.fx_rate as REAL), ?) ELSE 1 END)),0) as cost_uzs
      FROM sale_allocations a
      JOIN sale_items si ON si.id = a.sale_item_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?, '-30 days')
    `,
    )
    .get(fx, bizNowIso) as { cost_uzs: number };

  const profit30 = revenue30.revenue_uzs - cost30.cost_uzs;
  const margin30 = revenue30.revenue_uzs > 0 ? (profit30 / revenue30.revenue_uzs) * 100 : 0;

  const deposits = database.prepare("SELECT COALESCE(SUM(CAST(deposit_balance as REAL)),0) as sum FROM customers").get() as { sum: number };

  const debt = database
    .prepare(
      `
      WITH debt_sales AS (
        SELECT s.id, s.customer_id, datetime(s.closed_at) as closed_at,
               (CAST(s.total as REAL) - CAST(s.paid as REAL)) as debt_sale,
               (CAST(s.total as REAL) - CAST(s.paid as REAL)) * (CASE WHEN s.currency='USD' THEN COALESCE(CAST(s.fx_rate_used as REAL), ?) ELSE 1 END) as debt_uzs
        FROM sales s
        WHERE s.status='CLOSED' AND s.customer_id IS NOT NULL AND s.closed_at IS NOT NULL
      )
      SELECT
        COALESCE(SUM(CASE WHEN debt_sale > 0 THEN debt_uzs ELSE 0 END),0) as debt_uzs,
        COALESCE(SUM(CASE
          WHEN debt_sale > 0 AND c.debt_days IS NOT NULL AND datetime(ds.closed_at, '+' || c.debt_days || ' days') < datetime(?)
          THEN debt_uzs ELSE 0 END),0) as overdue_uzs
      FROM debt_sales ds
      JOIN customers c ON c.id = ds.customer_id
    `,
    )
    .get(fx, bizNowIso) as { debt_uzs: number; overdue_uzs: number };

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

  const topProducts7 = database
    .prepare(
      `
      SELECT p.name, p.sku,
             SUM(CAST(si.qty as REAL)) as qty,
             SUM(CAST(si.total as REAL) * (CASE WHEN s.currency='USD' THEN COALESCE(CAST(s.fx_rate_used as REAL), ?) ELSE 1 END)) as revenue_uzs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.status='CLOSED' AND s.closed_at IS NOT NULL AND datetime(s.closed_at) >= datetime(?, '-7 days')
      GROUP BY p.id
      ORDER BY revenue_uzs DESC
      LIMIT 5
    `,
    )
    .all(fx, bizNowIso) as Array<{ name: string; sku: string; qty: number; revenue_uzs: number }>;

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Выручка">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span>Сегодня</span>
              <span className="font-medium">{fmtMoneyUzs(sumToday.sum)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Вчера</span>
              <span className="font-medium">{fmtMoneyUzs(sumYesterday.sum)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>7 дней</span>
              <span className="font-medium">
                {fmtMoneyUzs(revenue7.revenue_uzs)}
                {pct(revenue7.revenue_uzs, revenuePrev7.revenue_uzs) !== null ? (
                  <span className="ml-2 text-xs text-zinc-500">({pct(revenue7.revenue_uzs, revenuePrev7.revenue_uzs)!.toFixed(1)}%)</span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>30 дней</span>
              <span className="font-medium">{fmtMoneyUzs(revenue30.revenue_uzs)}</span>
            </div>
          </div>
        </Card>

        <Card title="Прибыль (30 дней)">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span>Выручка</span>
              <span className="font-medium">{fmtMoneyUzs(revenue30.revenue_uzs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Себестоимость</span>
              <span className="font-medium">{fmtMoneyUzs(cost30.cost_uzs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Прибыль</span>
              <span className="font-medium">{fmtMoneyUzs(profit30)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Маржа</span>
              <span className="font-medium">{margin30.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card title="Чеки (7 дней)">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span>Чеков</span>
              <span className="font-medium">{fmtInt(revenue7.checks)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Средний чек</span>
              <span className="font-medium">{fmtMoneyUzs(revenue7.avg_check_uzs)}</span>
            </div>
            <div className="text-xs text-zinc-500">USD конвертируется по курсу чека.</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Дебиторка и депозит">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span>Долги клиентов</span>
              <span className="font-medium">{fmtMoneyUzs(debt.debt_uzs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Просрочено</span>
              <span className="font-medium">{fmtMoneyUzs(debt.overdue_uzs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Депозиты клиентов</span>
              <span className="font-medium">{fmtMoneyUzs(deposits.sum)}</span>
            </div>
            <div className="text-xs text-zinc-500">Долг считается как (total − paid) по закрытым чекам.</div>
          </div>
        </Card>

        <Card title="Топ товары (7 дней)">
          {topProducts7.length === 0 ? (
            <div className="text-zinc-500">Нет продаж за 7 дней</div>
          ) : (
            <ul className="space-y-1">
              {topProducts7.map((r, i) => (
                <li key={r.sku} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {r.name} <span className="text-xs text-zinc-400">({r.sku})</span>
                  </span>
                  <span className="text-xs text-zinc-500">{fmtMoneyUzs(r.revenue_uzs)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="AI: Скоро закончатся (минимум)">
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
        <Card title="AI: Подсказка по заказу (точка заказа)">
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
