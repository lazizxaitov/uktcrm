"use server";

import { db } from "@/lib/db/db";

export async function markAllNotificationsReadAction() {
  const database = db();
  database.prepare("UPDATE notifications SET is_read=1 WHERE is_read=0").run();
}

export async function markNotificationReadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const database = db();
  database.prepare("UPDATE notifications SET is_read=1 WHERE id=?").run(id);
}

