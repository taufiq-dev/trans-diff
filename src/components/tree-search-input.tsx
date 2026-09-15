import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TreeSearchInputProps = {
  className?: string;
  matchCount: number | null;
  onValueChange: (value: string) => void;
  value: string;
};

const SEARCH_APPLY_DELAY_MS = 120;

export function TreeSearchInput({
  className,
  matchCount,
  onValueChange,
  value,
}: TreeSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const deferredInputValue = useDeferredValue(inputValue);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (deferredInputValue === value) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        onValueChange(deferredInputValue);
      });
    }, SEARCH_APPLY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deferredInputValue, onValueChange, value]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        aria-label='Search keys or paths'
        className='h-7 pr-7 pl-7 text-sm'
        placeholder='Search keys…'
        value={inputValue}
        onChange={handleInputChange}
      />
      {inputValue ? (
        <Button
          aria-label='Clear search'
          className='absolute top-1/2 right-0.5 -translate-y-1/2'
          size='icon-xs'
          variant='ghost'
          onClick={() => setInputValue('')}
        >
          <X />
        </Button>
      ) : null}
      {inputValue && matchCount !== null && (
        <span className='pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums'>
          {matchCount}
        </span>
      )}
    </div>
  );
}
