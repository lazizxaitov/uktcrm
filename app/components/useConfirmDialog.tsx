"use client";

import { useMemo, useRef, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

export function useConfirmDialog() {
  const onConfirmRef = useRef<null | (() => void)>(null);
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions | null }>({ open: false, opts: null });

  const confirm = (onConfirm: () => void, opts: ConfirmOptions) => {
    onConfirmRef.current = onConfirm;
    setState({ open: true, opts });
  };

  const close = () => {
    onConfirmRef.current = null;
    setState({ open: false, opts: null });
  };

  const dialog = useMemo(() => {
    const opts = state.opts;
    return (
      <ConfirmDialog
        open={state.open}
        title={opts?.title}
        message={opts?.message ?? ""}
        confirmText={opts?.confirmText}
        cancelText={opts?.cancelText}
        onCancel={close}
        onConfirm={() => {
          const fn = onConfirmRef.current;
          close();
          fn?.();
        }}
      />
    );
  }, [state.open, state.opts]);

  return { confirm, dialog };
}

