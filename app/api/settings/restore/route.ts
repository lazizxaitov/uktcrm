import { requireUserForRoute } from "@/lib/auth/route";
import { closeDb } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import { getDbFilePath } from "@/lib/db/paths";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUserForRoute();
  if (!user) return new Response("Не авторизован", { status: 401 });
  if (user.role !== "Admin") return new Response("Недостаточно прав", { status: 403 });

  const form = await request.formData();
  const file = form.get("backup") as File | null;
  if (!file) return new Response("Файл не найден", { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 100) return new Response("Файл слишком маленький", { status: 400 });

  const dbPath = getDbFilePath();
  const dataDir = path.dirname(dbPath);
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  const tmpPath = path.join(dataDir, `restore-${Date.now()}.sqlite`);

  try {
    await fs.writeFile(tmpPath, buf);

    closeDb();
    await fs.rm(walPath, { force: true });
    await fs.rm(shmPath, { force: true });
    await fs.rm(dbPath, { force: true });
    await fs.rename(tmpPath, dbPath);

    migrate();
    return new Response(null, {
      status: 303,
      headers: { Location: "/settings?restore=ok" },
    });
  } catch {
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      // ignore
    }
    return new Response("Не удалось восстановить базу", { status: 500 });
  }
}
