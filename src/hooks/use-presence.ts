import { useEffect, useState } from 'react';

// Keeps an element mounted for `exitDurationMs` after `open` turns false so
// it can play an exit animation. Style the element with `data-state`.
export function usePresence(open: boolean, exitDurationMs: number) {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (open) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setMounted(false), exitDurationMs);
    return () => window.clearTimeout(timeoutId);
  }, [exitDurationMs, open]);

  return { mounted, state: open ? 'open' : 'closed' } as const;
}
