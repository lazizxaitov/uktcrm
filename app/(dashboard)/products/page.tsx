import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import ProductsView from "@/app/(dashboard)/products/ui/ProductsView";

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
    <ProductsView rows={rows} categories={categories} />
  );
}
