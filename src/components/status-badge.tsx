import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone = 'default' | 'danger' | 'warning' | 'success';

function StatusBadge({
  className,
  children,
  tone,
}: {
  className?: string;
  children: ReactNode;
  tone: StatusTone;
}) {
  return (
    <Badge
      variant='secondary'
      className={cn(
        tone === 'danger' && 'bg-destructive/10 text-destructive',
        tone === 'warning' &&
          'bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
        tone === 'success' &&
          'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export { StatusBadge, type StatusTone };
