export const metadata = { title: "Склад • UKT CRM" };

export default function StockPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Склад</h1>
      <div className="mt-1 text-sm text-zinc-500">Партии, FIFO, перемещения.</div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        Скоро добавлю приход/перемещение и FIFO партии.
      </div>
    </div>
  );
}

