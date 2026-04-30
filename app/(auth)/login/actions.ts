"use server";

import { redirect } from "next/navigation";
import { serverLogin } from "@/lib/auth/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const res = await serverLogin(email.trim(), password);
  if (!res.ok) return { ok: false as const };
  redirect("/dashboard");
}

