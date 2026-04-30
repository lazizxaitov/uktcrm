"use server";

import { requireUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/log";
import { setSetting } from "@/lib/settings/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const fx = str(formData, "fx_usd_uzs");
  const mode = str(formData, "overpay_mode");

  if (!fx) return { ok: false as const };
  if (mode !== "DEPOSIT" && mode !== "SELLER_MINUS") return { ok: false as const };

  setSetting("fx_usd_uzs", fx);
  setSetting("overpay_mode", mode);
  logAudit({ userId: user.id, action: "UPDATE", entity: "settings", payload: { fx_usd_uzs: fx, overpay_mode: mode } });
  return { ok: true as const };
}

