"use client";

import { useCallback, useRef, useState } from "react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Programmatic confirmation dialog. Replaces `window.confirm()` with
 * a styled, keyboard-accessible modal that matches the rest of the
 * app. Returns a Promise<boolean> that resolves to true on confirm
 * and false on cancel.
 *
 * Usage:
 *   const { confirm, dialogProps } = useConfirm();
 *   const ok = await confirm({
 *     title: "Delete review?",
 *     message: "This action cannot be undone.",
 *     variant: "danger",
 *   });
 *   if (!ok) return;
 *
 *   return <>{dialogProps && <ConfirmDialog {...dialogProps} />}</>;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    if (resolveRef.current) resolveRef.current(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  return {
    confirm,
    dialogProps: state
      ? {
          open: true,
          title: state.title,
          message: state.message,
          confirmText: state.confirmText,
          cancelText: state.cancelText,
          variant: state.variant,
          onConfirm: () => close(true),
          onCancel: () => close(false),
        }
      : null,
  };
}
