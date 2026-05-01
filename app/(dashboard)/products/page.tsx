import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import ProductsTable from "@/app/(dashboard)/products/ui/ProductsTable";

export const metadata = { title: "Товары • UKT CRM" };

export default function ProductsPage() {
  migrate();
  const database = db();
  const categories = database.prepare("SELECT id, name FROM categories ORDER BY name ASC").all() as Array<{ id: string; name: string }>;
  const rows = database
    .prepare(
      `
      SELECT p.id, p.name, p.sku, p.barcode, p.category_id, c.name as category_name,
             p.box_size, p.safety_stock, p.reorder_point
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY datetime(p.created_at) DESC
      LIMIT 500
    `,
    )
    .all() as Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: string | null;
    category_name: string | null;
    box_size: number | null;
    safety_stock: string;
    reorder_point: string;
  }>;
  return (
    <div>
      <h1 className="text-xl font-semibold">Товары</h1>
      <div className="mt-1 text-sm text-zinc-500">SKU, категории, точки заказа и safety stock.</div>
      <div className="mt-6">
        <ProductsTable rows={rows} categories={categories} />
      </div>
    </div>
  );
}
