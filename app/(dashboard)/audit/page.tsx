import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";

export const metadata = { title: "Аудит • UKT CRM" };

export default function AuditPage() {
  migrate();
  const database = db();
  const rows = database
    .prepare(
      `
      SELECT a.id, a.action, a.entity, a.entity_id, a.payload, a.created_at,
             u.name as user_name, u.role as user_role
      FROM audit a
      JOIN users u ON u.id = a.user_id
      ORDER BY datetime(a.created_at) DESC
      LIMIT 500
    `,
    )
    .all() as Array<{
    id: string;
    action: string;
    entity: string;
    entity_id: string | null;
    payload: string | null;
    created_at: string;
    user_name: string;
    user_role: string;
  }>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Аудит</h1>
      <div className="mt-1 text-sm text-zinc-500">Журнал действий по системе.</div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Когда</th>
                <th className="px-4 py-3 text-left font-medium">Пользователь</th>
                <th className="px-4 py-3 text-left font-medium">Действие</th>
                <th className="px-4 py-3 text-left font-medium">Сущность</th>
                <th className="px-4 py-3 text-left font-medium">Детали</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                    Пока нет событий
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.created_at.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.user_name}</div>
                      <div className="text-xs text-zinc-500">{r.user_role}</div>
                    </td>
                    <td className="px-4 py-3">{r.action}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.entity}
                      {r.entity_id ? <span className="text-xs text-zinc-400"> • {r.entity_id}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                      {r.payload ? r.payload.slice(0, 160) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
