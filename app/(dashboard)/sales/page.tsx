import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import SalesView from "@/app/(dashboard)/sales/ui/SalesView";

export const metadata = { title: "Продажи • UKT CRM" };

export default function SalesPage() {
  migrate();
  const database = db();

  const customers = database.prepare("SELECT id, name FROM customers ORDER BY name LIMIT 1000").all() as Array<{ id: string; name: string }>;
  const products = database.prepare("SELECT id, name, sku FROM products ORDER BY name LIMIT 2000").all() as Array<{ id: string; name: string; sku: string }>;

  const openSale = database
    .prepare(
      `
      SELECT s.id, s.currency, s.created_at, s.customer_id, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.status='OPEN'
      ORDER BY datetime(s.created_at) DESC
      LIMIT 1
    `,
    )
    .get() as { id: string; currency: string; created_at: string; customer_id: string | null; customer_name: string | null } | undefined;

  const openItems = openSale
    ? (database
        .prepare(
          `
          SELECT si.id, si.product_id, si.qty, si.price, si.total, p.name, p.sku
          FROM sale_items si
          JOIN products p ON p.id = si.product_id
          WHERE si.sale_id=?
          ORDER BY datetime(si.created_at) ASC
        `,
        )
        .all(openSale.id) as Array<{ id: string; product_id: string; qty: string; price: string; total: string; name: string; sku: string }>)
    : [];

  const lastSales = database
    .prepare(
      `
      SELECT s.id, s.status, s.currency, s.total, s.paid, s.created_at, s.closed_at, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY datetime(s.created_at) DESC
      LIMIT 50
    `,
    )
    .all() as Array<{
    id: string;
    status: string;
    currency: string;
    total: string;
    paid: string;
    created_at: string;
    closed_at: string | null;
    customer_name: string | null;
  }>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Продажи</h1>
      <div className="mt-1 text-sm text-zinc-500">Чеки, оплата и возвраты.</div>
      <div className="mt-6">
        <SalesView customers={customers} products={products} openSale={openSale ?? null} openItems={openItems} lastSales={lastSales} />
      </div>
    </div>
  );
}
