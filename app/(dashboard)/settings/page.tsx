import { getSettings } from "@/lib/settings/server";
import SettingsForm from "@/app/(dashboard)/settings/ui/SettingsForm";

export const metadata = { title: "Настройки • UKT CRM" };

export default function SettingsPage() {
  const settings = getSettings();
  return (
    <div>
      <h1 className="text-xl font-semibold">Настройки</h1>
      <div className="mt-1 text-sm text-zinc-500">Параметры оплаты, валюты и логики депозита.</div>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
