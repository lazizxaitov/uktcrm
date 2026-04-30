import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";

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
  const products = database.prepare("SELECT COUNT(1) as cnt FROM products").get() as { cnt: number };
  const customers = database.prepare("SELECT COUNT(1) as cnt FROM customers").get() as { cnt: number };
  const salesToday = database
    .prepare("SELECT COUNT(1) as cnt FROM sales WHERE date(created_at)=date('now')")
    .get() as { cnt: number };
  const sumToday = database
    .prepare("SELECT COALESCE(SUM(CAST(total as REAL)),0) as sum FROM sales WHERE status='CLOSED' AND date(created_at)=date('now')")
    .get() as { sum: number };

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
        <Card title="AI: Неликвид (30/60/90 дней)">Появится после подключения продаж и аналитики по чекам.</Card>
        <Card title="AI: Прогноз выручки">Появится после подключения продаж и закрытия чеков.</Card>
      </div>
    </div>
  );
}
