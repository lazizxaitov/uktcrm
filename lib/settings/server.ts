import { db } from "@/lib/db/db";

export type Settings = {
  fxUsdUzs: string;
  overpayMode: "DEPOSIT" | "SELLER_MINUS";
};

export function getSettings(): Settings {
  const database = db();
  const fx = (database.prepare("SELECT value FROM meta WHERE key='fx_usd_uzs'").get() as { value?: string } | undefined)?.value ?? "12500";
  const mode = (database.prepare("SELECT value FROM meta WHERE key='overpay_mode'").get() as { value?: string } | undefined)?.value ?? "DEPOSIT";
  return { fxUsdUzs: fx, overpayMode: mode === "SELLER_MINUS" ? "SELLER_MINUS" : "DEPOSIT" };
}

export function setSetting(key: string, value: string) {
  const database = db();
  database.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}

