import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { KindSelect } from '@/components/tree/kind-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ValueKind } from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type AddChildPopoverProps = {
  className?: string;
  fileName: string;
  mode: 'array' | 'object';
  onAdd: (key: string, kind: ValueKind) => boolean;
};

function AddChildPopover({
  className,
  fileName,
  mode,
  onAdd,
}: AddChildPopoverProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [kind, setKind] = useState<ValueKind>('string');
  const [error, setError] = useState<string | null>(null);
  const isObject = mode === 'object';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKey = key.trim();

    if (isObject && !trimmedKey) {
      setError('Enter a key name.');
      return;
    }

    if (!onAdd(trimmedKey, kind)) {
      setError(`"${trimmedKey}" already exists.`);
      return;
    }

    setKey('');
    setError(null);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            aria-label={isObject ? 'Add key' : 'Add item'}
            className={className}
            size='icon-xs'
            variant='ghost'
          />
        }
      >
        <Plus />
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64'>
        <PopoverHeader>
          <PopoverTitle>{isObject ? 'Add key' : 'Add item'}</PopoverTitle>
          <PopoverDescription className='truncate text-xs'>
            in {fileName}
          </PopoverDescription>
        </PopoverHeader>
        <form className='flex flex-col gap-2' onSubmit={handleSubmit}>
          {isObject && (
            <Input
              aria-label='New key name'
              autoFocus
              aria-invalid={error !== null}
              placeholder='Key name'
              value={key}
              onChange={(event) => {
                setKey(event.target.value);
                setError(null);
              }}
            />
          )}
          <div className='flex items-center gap-2'>
            <KindSelect
              className='flex-1'
              label={isObject ? 'New key type' : 'New item type'}
              value={kind}
              onChange={setKind}
            />
            <Button size='sm' type='submit'>
              Add
            </Button>
          </div>
          <p
            className={cn(
              'min-h-4 text-xs',
              error ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {error ?? `Creates an empty ${kind} value.`}
          </p>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export { AddChildPopover };
