import { migrate } from "@/lib/db/migrate";
import LoginForm from "@/app/(auth)/login/ui/LoginForm";
import Image from "next/image";

export const metadata = {
  title: "UKT CRM • Вход",
};

export default function LoginPage() {
  migrate();
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Image src="/ukt-logo.png" alt="UKT" width={110} height={24} style={{ height: "24px", width: "auto" }} priority />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Вход</h1>
        <p className="mt-1 text-sm text-zinc-500">Для теста: admin@local / admin</p>
        <LoginForm />
      </div>
    </div>
  );
}
