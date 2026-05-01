import { cookies } from "next/headers";
import crypto from "node:crypto";

export async function requireUserForRoute() {
  const token = (await cookies()).get("uktcrm_session")?.value;
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const secret = process.env.AUTH_SECRET || "dev_secret_change_me";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  if (expected !== sig) return null;
  try {
    const padded = data.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((data.length + 3) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as any;
    const exp = Number(payload.exp ?? 0);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    const user = { id: String(payload.id ?? ""), name: String(payload.name ?? ""), email: String(payload.email ?? ""), role: String(payload.role ?? "") };
    if (!user.id || !user.role) return null;
    return user;
  } catch {
    return null;
  }
}
