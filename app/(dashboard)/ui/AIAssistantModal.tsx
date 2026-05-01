"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-soft)] via-transparent to-transparent" />
          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l1.2 3.6L17 7l-3.8 1.4L12 12l-1.2-3.6L7 7l3.8-1.4L12 2Z" />
                  <path d="M19 12l.8 2.4L22 15l-2.2.6L19 18l-.8-2.4L16 15l2.2-.6L19 12Z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold">{props.title}</div>
                <div className="text-xs text-zinc-500">Аналитика по вашей базе</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image src="/ukt-logo.png" alt="UKT" width={84} height={20} style={{ height: "20px", width: "auto" }} priority />
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">{props.children}</div>
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
    if (props.open) return;
    setLoading(false);
    setMessages([
      {
        role: "assistant",
        text: "Выберите готовый вопрос — я покажу аналитику по вашей базе.",
      },
    ]);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 0);
  }, [props.open, messages.length]);

  const presets: Array<{ label: string; type: string }> = [
    { label: "Какие товары скоро закончатся", type: "runout_soon" },
    { label: "Какие товары медленно продаются", type: "slow_sellers_30d" },
    { label: "Какие клиенты просели", type: "customers_down_30d" },
    { label: "Прогноз продаж", type: "sales_forecast" },
    { label: "Товары на исходе (safety)", type: "low_stock" },
    { label: "Топ товары (30 дней)", type: "top_products_30d" },
    { label: "Продажи сегодня", type: "sales_today" },
    { label: "Продажи за 7 дней", type: "sales_7d" },
    { label: "Продажи за 30 дней", type: "sales_30d" },
    { label: "Прибыль за 30 дней", type: "profit_30d" },
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
      <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div ref={listRef} className="h-[44vh] overflow-auto bg-gradient-to-b from-zinc-50 to-white p-4 dark:from-zinc-950 dark:to-zinc-950">
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-[var(--brand)] text-white"
                      : "border border-zinc-200 bg-white text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading ? <div className="text-xs text-zinc-500">Думаю…</div> : null}
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-zinc-500">Готовые вопросы</div>
            <div className="text-xs text-zinc-400">Нажмите, чтобы получить ответ</div>
          </div>
          <div className="mt-2 flex gap-2 overflow-auto pb-1">
            {presets.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => runPreset(p.type, p.label)}
                disabled={loading}
                className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
