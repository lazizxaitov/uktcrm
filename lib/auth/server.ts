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

const COOKIE_NAME = "uktcrm_session";
const TWO_WEEKS_MS = 1000 * 60 * 60 * 24 * 14;

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function unb64url(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(data: string) {
  const secret = process.env.AUTH_SECRET || "dev_secret_change_me";
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function encodeSession(payload: object) {
  const json = JSON.stringify(payload);
  const data = b64url(Buffer.from(json, "utf8"));
  const sig = sign(data);
  return `${data}.${sig}`;
}

function decodeSession(token: string): any | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  if (sign(data) !== sig) return null;
  try {
    const json = unb64url(data).toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AuthUser> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  const payload = decodeSession(token);
  if (!payload) redirect("/login");
  const exp = Number(payload.exp ?? 0);
  if (!Number.isFinite(exp) || Date.now() > exp) redirect("/login");
  const user: AuthUser = {
    id: String(payload.id ?? ""),
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    role: String(payload.role ?? ""),
  };
  if (!user.id || !user.role) redirect("/login");
  return user;
}

export async function serverLogin(email: string, password: string) {
  const database = db();
  const row = database
    .prepare("SELECT id, password_hash FROM users WHERE email=?")
    .get(email) as { id: string; password_hash: string } | undefined;
  if (!row) return { ok: false as const };
  if (row.password_hash !== sha256(password)) return { ok: false as const };

  const user = database.prepare("SELECT id, name, email, role FROM users WHERE id=?").get(row.id) as AuthUser | undefined;
  if (!user) return { ok: false as const };

  const exp = Date.now() + TWO_WEEKS_MS;
  const token = encodeSession({ ...user, exp });
  const expires = new Date(exp);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return { ok: true as const };
}

export async function serverLogout() {
  (await cookies()).set(COOKIE_NAME, "", { path: "/", expires: new Date(0) });
}
