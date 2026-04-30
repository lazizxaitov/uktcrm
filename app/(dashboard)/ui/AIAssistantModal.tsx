"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="text-sm font-semibold">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Закрыть
          </button>
        </div>
        <div className="p-5">{props.children}</div>
      </div>
    </div>
  );
}

async function ask(type: string, text?: string) {
  const res = await fetch("/api/ai/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, text }),
  });
  const data = (await res.json()) as { ok?: boolean; title?: string; text?: string };
  if (!res.ok || !data?.ok) return { title: "Ошибка", text: "Не удалось получить ответ. Попробуйте ещё раз." };
  return { title: data.title ?? "AI", text: data.text ?? "" };
}

export default function AIAssistantModal(props: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Выберите готовый вопрос — я покажу аналитику по вашей базе.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 0);
  }, [props.open, messages.length]);

  const presets: Array<{ label: string; type: string }> = [
    { label: "Топ товары (30 дней)", type: "top_products_30d" },
    { label: "Продажи сегодня", type: "sales_today" },
    { label: "Продажи за 7 дней", type: "sales_7d" },
    { label: "Продажи за 30 дней", type: "sales_30d" },
    { label: "Прибыль за 30 дней", type: "profit_30d" },
    { label: "Товары на исходе", type: "low_stock" },
    { label: "Статистика системы", type: "system_stats" },
  ];

  const runPreset = async (type: string, label: string) => {
    if (loading) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: label }]);
    const ans = await ask(type);
    setMessages((prev) => [...prev, { role: "assistant", text: `${ans.title}\n\n${ans.text}`.trim() }]);
    setLoading(false);
  };

  return (
    <Modal open={props.open} title="AI ассистент" onClose={props.onClose}>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-1 py-2 text-sm font-semibold">Готовые вопросы</div>
          <div className="space-y-2">
            {presets.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => runPreset(p.type, p.label)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div ref={listRef} className="h-[52vh] overflow-auto p-4">
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-[var(--brand)] text-white"
                        : "border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
                    ].join(" ")}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading ? <div className="text-xs text-zinc-500">Думаю…</div> : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
