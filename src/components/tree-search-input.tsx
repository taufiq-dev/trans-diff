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

type TreeSearchInputProps = {
  onValueChange: (value: string) => void;
  value: string;
};

const SEARCH_APPLY_DELAY_MS = 120;

export function TreeSearchInput({
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

  const clearSearch = () => {
    setInputValue('');
  };

  return (
    <div className='relative mt-3'>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        aria-label='Search keys or paths'
        className='h-9 rounded-3xl bg-input/50 pl-9 pr-9'
        placeholder='Search keys or paths'
        value={inputValue}
        onChange={handleInputChange}
      />
      {inputValue && (
        <Button
          aria-label='Clear key search'
          className='absolute right-1 top-1/2 size-7 -translate-y-1/2'
          size='icon-sm'
          variant='ghost'
          onClick={clearSearch}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
