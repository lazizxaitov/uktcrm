"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/(dashboard)/actions";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function svgProps() {
  return {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
  } as const;
}

function Icons() {
  const p = svgProps();
  return {
    dashboard: (
      <svg {...p}>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
    sales: (
      <svg {...p}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    stock: (
      <svg {...p}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    ),
    products: (
      <svg {...p}>
        <path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
        <circle cx="7" cy="7" r="1" />
      </svg>
    ),
    customers: (
      <svg {...p}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    reports: (
      <svg {...p}>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    audit: (
      <svg {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    settings: (
      <svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  };
}

function IconWrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={[
        "grid h-9 w-9 place-items-center rounded-xl border",
        active ? "border-transparent bg-[var(--brand-soft)] text-[var(--brand)]" : "border-transparent bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function Sidebar(props: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const icons = useMemo(() => Icons(), []);
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; icon: React.ReactNode; top: number; left: number } | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("uktcrm.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("uktcrm.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed && tooltip) setTooltip(null);
  }, [collapsed, tooltip]);

  const showTooltipFor = (rect: DOMRect, text: string, icon: React.ReactNode) => {
    const width = 240; // ~кнопка как в раскрытом виде
    const padding = 12;
    let left = rect.right + padding;
    if (typeof window !== "undefined") {
      left = Math.min(left, window.innerWidth - width - 12);
      left = Math.max(12, left);
    }
    setTooltip({ text, icon, top: rect.top + rect.height / 2, left });
  };

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Панель", icon: icons.dashboard },
    { href: "/sales", label: "Продажи", icon: icons.sales },
    { href: "/stock", label: "Склад", icon: icons.stock },
    { href: "/products", label: "Товары", icon: icons.products },
    { href: "/customers", label: "Клиенты", icon: icons.customers },
    { href: "/reports", label: "Отчёты", icon: icons.reports },
    { href: "/audit", label: "Аудит", icon: icons.audit },
    { href: "/settings", label: "Настройки", icon: icons.settings },
  ];

  return (
    <aside
      className={[
        "relative hidden h-screen shrink-0 flex-col border-r border-zinc-200 bg-white px-3 pt-3 pb-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex",
        collapsed ? "w-[76px]" : "w-64",
      ].join(" ")}
    >
      {collapsed && tooltip ? (
        <div className="pointer-events-none fixed z-[9999] -translate-y-1/2" style={{ top: tooltip.top, left: tooltip.left }}>
          <div className="flex h-12 w-60 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <IconWrap active={false}>{tooltip.icon}</IconWrap>
            <span className="truncate font-medium">{tooltip.text}</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <Image
            src="/ukt-logo.png"
            alt="UKT"
            width={96}
            height={22}
            style={{ height: "22px", width: "auto" }}
            className={collapsed ? "hidden" : ""}
            priority
          />
          <span className={collapsed ? "inline-flex items-center rounded-xl px-2 py-1 text-xs badge-brand font-semibold" : "hidden"}>UKT</span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          <span className={collapsed ? "rotate-180 block" : "block"}>
            <svg {...svgProps()}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <nav className={["mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1", collapsed ? "items-center" : ""].join(" ")}>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={(e) => {
                if (!collapsed) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                showTooltipFor(rect, item.label, item.icon);
              }}
              onMouseMove={(e) => {
                if (!collapsed) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                showTooltipFor(rect, item.label, item.icon);
              }}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(e) => {
                if (!collapsed) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                showTooltipFor(rect, item.label, item.icon);
              }}
              onBlur={() => setTooltip(null)}
              className={[
                "flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm transition-colors",
                active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
                collapsed ? "w-12 justify-center px-0" : "",
              ].join(" ")}
            >
              <IconWrap active={active}>{item.icon}</IconWrap>
              <span className={collapsed ? "hidden" : "truncate"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-zinc-200 p-2 text-xs dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl badge-brand text-sm font-semibold">
            {props.userName.slice(0, 1).toUpperCase()}
          </span>
          <div className={collapsed ? "hidden" : "min-w-0"}>
            <div className="truncate text-xs font-semibold">{props.userName}</div>
            <div className="truncate text-[11px] text-zinc-500">{props.userRole}</div>
          </div>
        </div>
        <div className="mt-2">
          <form action={logoutAction}>
            <button className={["w-full rounded-xl px-3 py-2 text-center text-sm btn-secondary", collapsed ? "px-0" : ""].join(" ")} title={collapsed ? "Выйти" : undefined}>
              {collapsed ? "⎋" : "Выйти"}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
