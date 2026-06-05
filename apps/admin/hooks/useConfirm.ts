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
