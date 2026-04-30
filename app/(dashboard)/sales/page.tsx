export const metadata = { title: "Продажи • UKT CRM" };

export default function SalesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Продажи</h1>
      <div className="mt-1 text-sm text-zinc-500">Чеки, оплата и возвраты.</div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        Скоро добавлю открытие/закрытие чека и оплату (нал/карта/смешанная).
      </div>
    </div>
  );
}

