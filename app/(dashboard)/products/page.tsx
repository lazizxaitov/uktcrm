import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import ProductsTable from "@/app/(dashboard)/products/ui/ProductsTable";

export const metadata = { title: "Товары • UKT CRM" };

export default function ProductsPage() {
  migrate();
  const database = db();
  const rows = database
    .prepare("SELECT id, name, sku, barcode, category, box_size, safety_stock, reorder_point FROM products ORDER BY created_at DESC LIMIT 500")
    .all() as Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    category: string | null;
    box_size: number | null;
    safety_stock: string;
    reorder_point: string;
  }>;
  return (
    <div>
      <h1 className="text-xl font-semibold">Товары</h1>
      <div className="mt-1 text-sm text-zinc-500">SKU, категории, точки заказа и safety stock.</div>
      <div className="mt-6">
        <ProductsTable rows={rows} />
      </div>
    </div>
  );
}
