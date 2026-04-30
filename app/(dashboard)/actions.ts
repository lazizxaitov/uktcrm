"use server";

import { redirect } from "next/navigation";
import { serverLogout } from "@/lib/auth/server";

export async function logoutAction() {
  await serverLogout();
  redirect("/login");
}

