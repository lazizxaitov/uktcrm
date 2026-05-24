import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import CustomersView from "@/app/(dashboard)/customers/ui/CustomersView";

export const metadata = { title: "Клиенты • UKT CRM" };

export default function CustomersPage() {
  migrate();
  const database = db();
  const rows = database
    .prepare("SELECT id, name, phone, debt_limit, debt_days, created_at FROM customers ORDER BY created_at DESC LIMIT 500")
    .all() as Array<{
    id: string;
    name: string;
    phone: string | null;
    debt_limit: string;
    debt_days: number | null;
    created_at: string;
  }>;

  return (
    <CustomersView rows={rows} />
  );
}
