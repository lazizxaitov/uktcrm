import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { db } from "@/lib/db/db";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function requireUser(): Promise<AuthUser> {
  const sessionId = (await cookies()).get("uktcrm_session")?.value;
  if (!sessionId) redirect("/login");

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
    .get(sessionId) as AuthUser | undefined;

  if (!row) redirect("/login");
  return row;
}

export async function serverLogin(email: string, password: string) {
  const database = db();
  const row = database
    .prepare("SELECT id, password_hash FROM users WHERE email=?")
    .get(email) as { id: string; password_hash: string } | undefined;
  if (!row) return { ok: false as const };
  if (row.password_hash !== sha256(password)) return { ok: false as const };

  const sessionId = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 days
  database
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionId, row.id, expires.toISOString());

  (await cookies()).set("uktcrm_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return { ok: true as const };
}

export async function serverLogout() {
  const sessionId = (await cookies()).get("uktcrm_session")?.value;
  if (sessionId) {
    const database = db();
    database.prepare("DELETE FROM sessions WHERE id=?").run(sessionId);
  }
  (await cookies()).set("uktcrm_session", "", { path: "/", expires: new Date(0) });
}

