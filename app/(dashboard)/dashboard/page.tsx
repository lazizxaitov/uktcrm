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
        <Card title="AI: Товары, которые скоро закончатся">Нет данных</Card>
        <Card title="AI: Неликвид (30 дней без продаж)">Нет данных</Card>
        <Card title="AI: Клиенты “просели”">Нет данных</Card>
        <Card title="AI: Прогноз выручки">Нет продаж</Card>
      </div>
    </div>
  );
}

