import { getSettings } from "@/lib/settings/server";
import SettingsForm from "@/app/(dashboard)/settings/ui/SettingsForm";
import { db } from "@/lib/db/db";

export const metadata = { title: "Настройки • UKT CRM" };

export default function SettingsPage() {
  const settings = getSettings();
  const database = db();
  const offsetRaw =
    (database.prepare("SELECT value FROM meta WHERE key='business_time_offset_min'").get() as { value?: string } | undefined)?.value ?? "0";
  const offsetMin = Number(offsetRaw);
  const serverNow = new Date();
  const businessNow = new Date(serverNow.getTime() + (Number.isFinite(offsetMin) ? offsetMin : 0) * 60000);
  return (
    <div>
      <h1 className="text-xl font-semibold">Настройки</h1>
      <div className="mt-1 text-sm text-zinc-500">Параметры оплаты, валюты и логики депозита.</div>
      <div className="mt-6">
        <SettingsForm
          settings={settings}
          serverNowIso={serverNow.toISOString()}
          businessNowIso={businessNow.toISOString()}
          businessOffsetMin={Number.isFinite(offsetMin) ? offsetMin : 0}
        />
      </div>
    </div>
  );
}
