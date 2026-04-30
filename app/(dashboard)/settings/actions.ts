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

export async function updateBusinessTimeAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "Admin") return { ok: false as const };

  const date = str(formData, "biz_date"); // YYYY-MM-DD
  const time = str(formData, "biz_time"); // HH:MM
  if (!date || !time) return { ok: false as const };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return { ok: false as const };

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const hh = Number(t[1]);
  const mm = Number(t[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da) || !Number.isFinite(hh) || !Number.isFinite(mm)) return { ok: false as const };

  const target = new Date(y, mo, da, hh, mm, 0, 0).getTime();
  if (!Number.isFinite(target)) return { ok: false as const };

  const now = Date.now();
  const offsetMin = Math.round((target - now) / 60000);
  setSetting("business_time_offset_min", String(offsetMin));
  logAudit({ userId: user.id, action: "UPDATE", entity: "business_time", payload: { offsetMin } });
  return { ok: true as const };
}

export async function resetBusinessTimeAction() {
  const user = await requireUser();
  if (user.role !== "Admin") return { ok: false as const };
  setSetting("business_time_offset_min", "0");
  logAudit({ userId: user.id, action: "UPDATE", entity: "business_time", payload: { offsetMin: 0 } });
  return { ok: true as const };
}
