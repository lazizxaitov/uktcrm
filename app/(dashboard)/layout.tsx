import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { migrate } from "@/lib/db/migrate";
import { db } from "@/lib/db/db";
import HeaderActions from "@/app/(dashboard)/ui/HeaderActions";
import Sidebar from "@/app/(dashboard)/ui/Sidebar";

export const metadata = {
  title: "UKT CRM",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  migrate();
  const user = await requireUser();
  const database = db();

  const unread = database.prepare("SELECT COUNT(1) as cnt FROM notifications WHERE is_read=0").get() as { cnt: number };
  const notifications = database
    .prepare("SELECT id, type, message, created_at FROM notifications WHERE is_read=0 ORDER BY created_at DESC LIMIT 8")
    .all() as Array<{ id: string; type: string; message: string; created_at: string }>;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Sidebar userName={user.name} userRole={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs badge-brand">UKT</span>
            <span>CRM</span>
          </Link>
          <HeaderActions
            userName={user.name}
            userEmail={user.email}
            userRole={user.role}
            unreadCount={unread.cnt}
            notifications={notifications}
          />
        </header>
        <main className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

