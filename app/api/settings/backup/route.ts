import { requireUserForRoute } from "@/lib/auth/route";
import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

function ymdHm(d: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

export async function GET() {
  const user = await requireUserForRoute();
  if (!user) return new Response("Не авторизован", { status: 401 });
  if (user.role !== "Admin") return new Response("Недостаточно прав", { status: 403 });

  migrate();
  const database = db();
  try {
    database.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // ignore
  }

  const dir = path.join(process.cwd(), "data");
  const fileName = `uktcrm-backup-${ymdHm(new Date())}.sqlite`;
  const tmpPath = path.join(dir, fileName);
  const safe = tmpPath.replaceAll("'", "''");

  try {
    database.exec(`VACUUM INTO '${safe}'`);
    const buf = await fs.readFile(tmpPath);
    await fs.rm(tmpPath, { force: true });
    return new Response(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      // ignore
    }
    return new Response("Не удалось создать резервную копию", { status: 500 });
  }
}

