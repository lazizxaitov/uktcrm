"use client";

import { useState } from "react";
import { loginAction } from "@/app/(auth)/login/actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setError(null);
        const res = await loginAction(formData);
        if (!res?.ok) setError("Неверный логин или пароль");
      }}
      className="mt-5 space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-zinc-600">Почта</label>
        <input
          name="email"
          defaultValue="admin@local"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600">Пароль</label>
        <input
          name="password"
          type="password"
          defaultValue="admin"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-zinc-800 dark:bg-zinc-950"
          autoComplete="current-password"
        />
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-medium btn-primary">
        Войти
      </button>
    </form>
  );
}

