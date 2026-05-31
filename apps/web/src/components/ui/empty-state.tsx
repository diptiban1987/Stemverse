import type { LucideIcon } from 'lucide-react';
import { Button } from '@stemverse/ui';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button type="button" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
