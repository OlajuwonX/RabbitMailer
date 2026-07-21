"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "loading";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  show(type: ToastType, message: string): string;
  dismiss(id?: string): void;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (type, message) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [{ id, type, message }, ...state.toasts].slice(0, MAX_TOASTS),
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: id ? state.toasts.filter((toast) => toast.id !== id) : [],
    })),
}));

export function useToast() {
  const show = useToastStore((state) => state.show);
  const dismiss = useToastStore((state) => state.dismiss);

  return {
    success: useCallback((message: string) => show("success", message), [show]),
    error: useCallback((message: string) => show("error", message), [show]),
    loading: useCallback((message: string) => show("loading", message), [show]),
    dismiss,
  };
}

export const toast = {
  success(message: string) {
    return useToastStore.getState().show("success", message);
  },
  error(message: string) {
    return useToastStore.getState().show("error", message);
  },
  loading(message: string) {
    return useToastStore.getState().show("loading", message);
  },
  dismiss(id?: string) {
    useToastStore.getState().dismiss(id);
  },
};

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timers = toasts
      .filter((item) => item.type !== "loading")
      .map((item) =>
        window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS),
      );
    return () => timers.forEach(window.clearTimeout);
  }, [dismiss, toasts]);

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
            item.type === "success" &&
              "border-emerald-500/25 bg-emerald-950/80 text-emerald-100",
            item.type === "error" &&
              "border-red-500/25 bg-red-950/80 text-red-100",
            item.type === "loading" &&
              "border-violet-500/25 bg-[#11111d]/90 text-slate-100",
          )}
        >
          <p className="text-sm">{item.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="rounded-md text-current opacity-70 hover:opacity-100"
            onClick={() => dismiss(item.id)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
