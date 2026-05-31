'use client';

import { create } from 'zustand';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }].slice(-5),
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(
  title: string,
  options?: { description?: string; variant?: ToastVariant },
) {
  useToastStore.getState().push({
    title,
    description: options?.description,
    variant: options?.variant ?? 'default',
  });
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-card',
  success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30',
  error: 'border-red-500/30 bg-red-50 dark:bg-red-950/30',
  warning: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`pointer-events-auto animate-slide-up rounded-lg border p-4 shadow-lg ${variantStyles[t.variant]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t.title}</p>
          {t.description && <p className="mt-1 text-xs text-muted">{t.description}</p>}
        </div>
        <button type="button" onClick={onDismiss} className="text-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
