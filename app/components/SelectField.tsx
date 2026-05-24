"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export default function SelectField(props: {
  name: string;
  label?: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(props.defaultValue ?? "");

  useEffect(() => {
    setValue(props.defaultValue ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultValue]);

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

  const selected = useMemo(() => props.options.find((o) => o.value === value) ?? null, [props.options, value]);
  const canSearch = props.searchable ?? props.options.length > 12;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!canSearch || !q) return props.options;
    return props.options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q));
  }, [canSearch, props.options, query]);

  return (
    <div ref={rootRef} className="relative">
      {props.label ? <label className="block text-xs font-medium text-zinc-600">{props.label}</label> : null}
      <input type="hidden" name={props.name} value={value} />

      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "mt-1 inline-flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none",
          "hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-[var(--brand)]" : "",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "truncate text-zinc-900 dark:text-zinc-50" : "truncate text-zinc-500"}>
          {selected ? selected.label : props.placeholder ?? "Выберите"}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          {canSearch ? (
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          ) : null}
          <div className="max-h-[280px] overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">Ничего не найдено</div>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value || "__empty__"}
                    type="button"
                    onClick={() => {
                      setValue(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm",
                      active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                    ].join(" ")}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="min-w-0 truncate">{o.label}</span>
                    {active ? <span className="text-xs">✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

