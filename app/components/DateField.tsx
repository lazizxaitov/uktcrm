"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const dt = new Date(y, mo, da);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== da) return null;
  return dt;
}

function formatRu(ymd: string) {
  const d = parseYmd(ymd);
  if (!d) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function monthDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday=0 ... Sunday=6
function weekdayMon0(d: Date) {
  return (d.getDay() + 6) % 7;
}

export default function DateField(props: {
  name: string;
  defaultValue?: string;
  min?: string;
  max?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => (props.defaultValue ? props.defaultValue : ""));

  const initial = useMemo(() => parseYmd(value) ?? new Date(), [value]);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (!open) return;
    const current = parseYmd(value);
    const base = current ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [open, value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node | null;
      if (!el) return;
      if (!rootRef.current?.contains(el)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const minD = props.min ? parseYmd(props.min) : null;
  const maxD = props.max ? parseYmd(props.max) : null;

  const canPick = (d: Date) => {
    if (minD && d < minD) return false;
    if (maxD && d > maxD) return false;
    return true;
  };

  const days = monthDays(viewYear, viewMonth);
  const first = new Date(viewYear, viewMonth, 1);
  const start = weekdayMon0(first);
  const todayYmd = toYmd(new Date());

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={props.name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 inline-flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className={value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}>
          {value ? formatRu(value) : "Выберите дату"}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v2" />
          <path d="M16 3v2" />
          <path d="M3 9h18" />
          <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              aria-label="Предыдущий месяц"
            >
              ←
            </button>
            <div className="text-sm font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              aria-label="Следующий месяц"
            >
              →
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-500">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: start }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: days }).map((_, i) => {
                const day = i + 1;
                const dt = new Date(viewYear, viewMonth, day);
                const ymd = toYmd(dt);
                const disabled = !canPick(dt);
                const isSelected = value === ymd;
                const isToday = todayYmd === ymd;
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setValue(ymd);
                      setOpen(false);
                    }}
                    className={[
                      "h-10 rounded-xl text-sm transition-colors",
                      disabled ? "cursor-not-allowed text-zinc-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                      isSelected ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-zinc-900 dark:text-zinc-50",
                      isToday && !isSelected ? "border border-zinc-200 dark:border-zinc-800" : "border border-transparent",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const ymd = toYmd(new Date());
                  const dt = parseYmd(ymd);
                  if (!dt || !canPick(dt)) return;
                  setValue(ymd);
                  setOpen(false);
                }}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

