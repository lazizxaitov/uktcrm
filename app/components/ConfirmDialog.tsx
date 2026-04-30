"use client";

export default function ConfirmDialog(props: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="text-sm font-semibold">{props.title ?? "Подтверждение"}</div>
        </div>
        <div className="p-5">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">{props.message}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={props.onCancel}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              {props.cancelText ?? "Отмена"}
            </button>
            <button type="button" onClick={props.onConfirm} className="flex-1 rounded-xl px-3 py-2 text-sm btn-primary">
              {props.confirmText ?? "Подтвердить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
