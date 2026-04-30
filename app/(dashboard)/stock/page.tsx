import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import StockBatches from "@/app/(dashboard)/stock/ui/StockBatches";

export const metadata = { title: "Склад • UKT CRM" };

export default function StockPage() {
  migrate();
  const database = db();

  const products = database
    .prepare("SELECT id, name, sku FROM products ORDER BY name LIMIT 2000")
    .all() as Array<{ id: string; name: string; sku: string }>;

  const batches = database
    .prepare(
      `
      SELECT b.id, b.product_id, b.qty_initial, b.qty_remaining, b.cost, b.currency, b.created_at,
             p.name, p.sku
      FROM stock_batches b
      JOIN products p ON p.id = b.product_id
      ORDER BY datetime(b.created_at) DESC
      LIMIT 800
    `,
    )
    .all() as Array<{
    id: string;
    product_id: string;
    qty_initial: string;
    qty_remaining: string;
    cost: string;
    currency: string;
    created_at: string;
    name: string;
    sku: string;
  }>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Склад</h1>
      <div className="mt-1 text-sm text-zinc-500">Партии, FIFO, перемещения.</div>
      <div className="mt-6">
        <StockBatches products={products} batches={batches} />
      </div>
    </div>
  );
}
