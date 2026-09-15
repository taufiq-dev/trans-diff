import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Ellipsis,
  Plus,
  Trash2,
} from 'lucide-react';
import { AddChildPopover } from '@/components/tree/add-child-popover';
import type { TreeActions } from '@/components/tree/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createDefaultValue,
  formatPath,
  getSuggestedKind,
  getValueAtPath,
  getValueKind,
  isJsonObject,
  MISSING,
  VALUE_KINDS,
  type JsonPath,
  type JsonValue,
  type TranslationFile,
  type ValueKind,
} from '@/lib/json-tree';
import { cn } from '@/lib/utils';

const hoverRevealClassName =
  'opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none';

const inlineInputClassName =
  'h-7 flex-1 border-transparent bg-transparent px-1.5 shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent dark:hover:bg-input/30';

type ValueCellProps = {
  actions: TreeActions;
  file: TranslationFile;
  files: TranslationFile[];
  path: JsonPath;
};

function CellMenu({
  actions,
  file,
  kind,
  path,
}: {
  actions: TreeActions;
  file: TranslationFile;
  kind: ValueKind;
  path: JsonPath;
}) {
  const segment = path[path.length - 1];
  const isArrayItem = typeof segment === 'number';
  const parent = isArrayItem
    ? getValueAtPath(file.data, path.slice(0, -1))
    : MISSING;
  const itemCount = Array.isArray(parent) ? parent.length : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${file.fileName} ${formatPath(path)}`}
            className={hoverRevealClassName}
            size='icon-xs'
            variant='ghost'
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='truncate'>{file.fileName}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Type
            <span className='ml-auto text-xs text-muted-foreground'>{kind}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={kind}
              onValueChange={(nextKind) =>
                actions.setKind(file.id, path, nextKind as ValueKind)
              }
            >
              {VALUE_KINDS.map((valueKind) => (
                <DropdownMenuRadioItem key={valueKind} value={valueKind}>
                  {valueKind}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {isArrayItem && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={segment === 0}
              onClick={() => actions.moveArrayItem(file.id, path, -1)}
            >
              <ArrowUp />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={segment >= itemCount - 1}
              onClick={() => actions.moveArrayItem(file.id, path, 1)}
            >
              <ArrowDown />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions.duplicateArrayItem(file.id, path)}
            >
              <Copy />
              Duplicate
            </DropdownMenuItem>
          </>
        )}
        {path.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              onClick={() => actions.removeValue(file.id, path)}
            >
              <Trash2 />
              Delete from this file
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PrimitiveEditor({
  actions,
  file,
  path,
  value,
}: {
  actions: TreeActions;
  file: TranslationFile;
  path: JsonPath;
  value: string | number | boolean | null;
}) {
  const kind = getValueKind(value);
  const label = `${file.fileName} ${formatPath(path)}`;

  if (kind === 'string') {
    return (
      <Input
        aria-label={label}
        className={inlineInputClassName}
        placeholder='Empty string'
        value={value as string}
        onChange={(event) => actions.setValue(file.id, path, event.target.value)}
      />
    );
  }

  if (kind === 'number') {
    return (
      <Input
        aria-label={label}
        className={cn(inlineInputClassName, 'tabular-nums')}
        type='number'
        value={String(value)}
        onChange={(event) =>
          actions.setValue(file.id, path, Number(event.target.value || 0))
        }
      />
    );
  }

  if (kind === 'boolean') {
    return (
      <Select
        value={String(value)}
        onValueChange={(nextValue) =>
          actions.setValue(file.id, path, nextValue === 'true')
        }
      >
        <SelectTrigger aria-label={label} className='font-mono' size='sm'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem className='font-mono' value='true'>
            true
          </SelectItem>
          <SelectItem className='font-mono' value='false'>
            false
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <span className='px-1.5 font-mono text-sm text-muted-foreground'>null</span>
  );
}

function ValueCell({ actions, file, files, path }: ValueCellProps) {
  const value = getValueAtPath(file.data, path);
  // Set when this cell was just created from "Missing", so only that swap
  // gets an entrance and existing cells render instantly.
  const [justAdded, setJustAdded] = useState(false);

  if (value === MISSING) {
    const suggestedKind = getSuggestedKind(files, path);

    return (
      <div className='flex w-full items-center gap-2'>
        <span className='text-xs text-muted-foreground'>Missing</span>
        <Button
          className='h-6 border border-dashed border-amber-500/50 text-amber-800 hover:bg-amber-500/10 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200'
          size='xs'
          variant='ghost'
          onClick={() => {
            setJustAdded(true);
            actions.setValue(file.id, path, createDefaultValue(suggestedKind));
          }}
        >
          <Plus />
          Add {suggestedKind}
        </Button>
      </div>
    );
  }

  const kind = getValueKind(value);

  if (Array.isArray(value) || isJsonObject(value)) {
    const isArray = Array.isArray(value);
    const count = isArray ? value.length : Object.keys(value).length;
    const noun = isArray
      ? count === 1
        ? 'item'
        : 'items'
      : count === 1
        ? 'key'
        : 'keys';

    return (
      <div className='flex w-full items-center gap-1'>
        <span className='px-1.5 text-xs text-muted-foreground'>
          <span className='tabular-nums'>{count}</span> {noun}
        </span>
        <AddChildPopover
          className={hoverRevealClassName}
          fileName={file.fileName}
          mode={isArray ? 'array' : 'object'}
          onAdd={(key, childKind) => {
            if (isArray) {
              actions.addArrayItem(file.id, path, childKind);
              return true;
            }
            return actions.addObjectKey(file.id, path, key, childKind);
          }}
        />
        <div className='ml-auto'>
          <CellMenu actions={actions} file={file} kind={kind} path={path} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1',
        justAdded &&
          'animate-in fade-in-0 zoom-in-98 duration-150 ease-out-quint motion-reduce:zoom-in-100',
      )}
      onAnimationEnd={() => setJustAdded(false)}
    >
      <PrimitiveEditor
        actions={actions}
        file={file}
        path={path}
        value={value as JsonValue as string | number | boolean | null}
      />
      <div className='ml-auto'>
        <CellMenu actions={actions} file={file} kind={kind} path={path} />
      </div>
    </div>
  );
}

export { ValueCell };
