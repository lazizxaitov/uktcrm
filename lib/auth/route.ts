import { cookies } from "next/headers";
import { db } from "@/lib/db/db";

export async function requireUserForRoute() {
  const sessionId = (await cookies()).get("uktcrm_session")?.value;
  if (!sessionId) return null;
  const database = db();
  const row = database
    .prepare(
      `
      SELECT u.id, u.name, u.email, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
    `,
    )
    .get(sessionId) as { id: string; name: string; email: string; role: string } | undefined;
  return row ?? null;
}

