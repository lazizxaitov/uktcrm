import { db } from "@/lib/db/db";

export function getBusinessNow() {
  const database = db();
  const offsetRaw =
    (database.prepare("SELECT value FROM meta WHERE key='business_time_offset_min'").get() as { value?: string } | undefined)?.value ?? "0";
  const offsetMin = Number(offsetRaw);
  const safeOffset = Number.isFinite(offsetMin) ? offsetMin : 0;
  return new Date(Date.now() + safeOffset * 60000);
}

