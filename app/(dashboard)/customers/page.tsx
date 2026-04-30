import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import CustomersTable from "@/app/(dashboard)/customers/ui/CustomersTable";

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
    <div>
      <h1 className="text-xl font-semibold">Клиенты</h1>
      <div className="mt-1 text-sm text-zinc-500">Карта клиента, лимит и срок долга.</div>
      <div className="mt-6">
        <CustomersTable rows={rows} />
      </div>
    </div>
  );
}
