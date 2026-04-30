"use client";

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
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  } as const;
}

function Icons() {
  const p = svgProps();
  return {
    dashboard: (
      <svg {...p}>
        <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3h8v6h-8V3zM3 21h8v-6H3v6z" />
      </svg>
    ),
    sales: (
      <svg {...p}>
        <path d="M3 7h18" />
        <path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 11h6" />
      </svg>
    ),
    stock: (
      <svg {...p}>
        <path d="M20 7l-8-4-8 4 8 4 8-4z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
    products: (
      <svg {...p}>
        <path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8" />
        <path d="M12 2l7 4-7 4-7-4 7-4z" />
        <path d="M5 6v6l7 4 7-4V6" />
      </svg>
    ),
    customers: (
      <svg {...p}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <path d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    ),
    reports: (
      <svg {...p}>
        <path d="M9 17v-6" />
        <path d="M12 17V7" />
        <path d="M15 17v-3" />
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2z" />
        <path d="M14 3v5h5" />
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

  useEffect(() => {
    const stored = window.localStorage.getItem("uktcrm.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("uktcrm.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Панель", icon: icons.dashboard },
    { href: "/sales", label: "Продажи", icon: icons.sales },
    { href: "/stock", label: "Склад", icon: icons.stock },
    { href: "/products", label: "Товары", icon: icons.products },
    { href: "/customers", label: "Клиенты", icon: icons.customers },
    { href: "/reports", label: "Отчёты", icon: icons.reports },
  ];

  return (
    <aside
      className={[
        "hidden h-screen shrink-0 flex-col border-r border-zinc-200 bg-white px-3 pt-3 pb-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex",
        collapsed ? "w-[76px]" : "w-64",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <span className="inline-flex items-center rounded-xl px-2 py-1 text-xs badge-brand font-semibold">UKT</span>
          <span className={collapsed ? "hidden" : "text-xs font-semibold text-zinc-700"}>CRM</span>
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
              title={collapsed ? item.label : undefined}
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

