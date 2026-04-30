"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(dashboard)/notifications/actions";
import { logoutAction } from "@/app/(dashboard)/actions";

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

export default function HeaderActions(props: {
  userName: string;
  userEmail: string;
  userRole: string;
  unreadCount: number;
  notifications: NotificationItem[];
}) {
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as Node | null;
      if (!el) return;
      if (!rootRef.current?.contains(el)) {
        setOpenProfile(false);
        setOpenNotifications(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenProfile(false);
      setOpenNotifications(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={rootRef} className="relative flex items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpenNotifications((v) => !v);
            setOpenProfile(false);
          }}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          aria-label="Уведомления"
          title="Уведомления"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 text-zinc-700 dark:text-zinc-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 17H9" />
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {props.unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {props.unreadCount > 99 ? "99+" : props.unreadCount}
            </span>
          ) : null}
        </button>

        {openNotifications ? (
          <div className="absolute right-0 mt-2 w-[420px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="text-sm font-semibold">Уведомления</div>
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  Прочитать всё
                </button>
              </form>
            </div>
            <div className="max-h-[420px] overflow-auto p-2">
              {props.notifications.length === 0 ? (
                <div className="p-3 text-sm text-zinc-500">Нет новых уведомлений</div>
              ) : (
                <ul className="space-y-2">
                  {props.notifications.map((n) => (
                    <li key={n.id} className="rounded-xl border border-zinc-100 p-3 text-sm dark:border-zinc-900">
                      <div className="text-[11px] text-zinc-500">
                        {n.type} • {n.created_at.slice(0, 19).replace("T", " ")}
                      </div>
                      <div className="mt-1">{n.message}</div>
                      <div className="mt-2 flex justify-end">
                        <form action={markNotificationReadAction}>
                          <input type="hidden" name="id" value={n.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
                          >
                            Понятно
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpenProfile((v) => !v);
            setOpenNotifications(false);
          }}
          className="inline-flex h-10 min-w-[220px] items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full badge-brand text-xs font-semibold">
              {props.userName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 text-left">
              <div className="truncate text-xs font-semibold leading-4">{props.userName}</div>
              <div className="truncate text-[11px] text-zinc-500">{props.userRole}</div>
            </div>
          </div>
          <span className="text-xs text-zinc-500">▼</span>
        </button>

        {openProfile ? (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="px-4 py-3">
              <div className="text-sm font-semibold">{props.userName}</div>
              <div className="text-xs text-zinc-500">{props.userEmail}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">{props.userRole}</div>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <div className="p-2">
              <Link className="block rounded-xl px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" href="/settings">
                Настройки
              </Link>
              <Link className="mt-1 block rounded-xl px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" href="/audit">
                Аудит
              </Link>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <div className="p-3">
              <form action={logoutAction}>
                <button type="submit" className="block w-full rounded-xl px-3 py-2 text-center text-sm btn-secondary">
                  Выйти
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

