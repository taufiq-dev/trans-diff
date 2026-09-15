import { useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  ChevronRight,
  ClipboardCopy,
  Ellipsis,
  PencilLine,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import {
  COLUMN_ENTER_CLASS_NAME,
  COLUMN_STAGGER_MAX_ROWS,
  COLUMN_STAGGER_STEP_MS,
  type EnteringFile,
  type TreeActions,
} from '@/components/tree/types';
import { ValueCell } from '@/components/tree/value-cell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  collectChildSegments,
  formatDottedPath,
  formatPath,
  formatSegment,
  getPathStatus,
  pathToKey,
  type JsonPath,
  type TranslationFile,
} from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type SearchFilter = {
  matchCount: number;
  visiblePathKeys: Set<string>;
};

type TreeRowProps = {
  actions: TreeActions;
  depth?: number;
  enteringFile: EnteringFile | null;
  expandedPaths: Set<string>;
  files: TranslationFile[];
  path: JsonPath;
  searchFilter: SearchFilter | null;
  staggerIndexByKey: Map<string, number> | null;
};

const TREE_COLUMN_CLASS_NAME = 'w-80 shrink-0';
const FILE_COLUMN_CLASS_NAME = 'min-w-72 flex-1';

function TreeRow({
  actions,
  depth = 0,
  enteringFile,
  expandedPaths,
  files,
  path,
  searchFilter,
  staggerIndexByKey,
}: TreeRowProps): ReactNode {
  const key = pathToKey(path);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);

  if (searchFilter && !searchFilter.visiblePathKeys.has(key)) {
    return null;
  }

  const rowIndex = staggerIndexByKey?.get(key) ?? 0;
  const enterDelayMs =
    Math.min(rowIndex, COLUMN_STAGGER_MAX_ROWS) * COLUMN_STAGGER_STEP_MS;

  const childSegments = collectChildSegments(files, path).filter(
    (childSegment) =>
      !searchFilter ||
      searchFilter.visiblePathKeys.has(pathToKey([...path, childSegment])),
  );
  const hasChildren = childSegments.length > 0;
  const isExpanded = searchFilter ? hasChildren : expandedPaths.has(key);
  const status = getPathStatus(files, path);
  const segment = path[path.length - 1];
  const isRoot = path.length === 0;
  const canRename = typeof segment === 'string';

  const commitRename = () => {
    const nextKey = renameDraft?.trim() ?? '';
    if (nextKey && nextKey !== segment) {
      actions.renameKey(path, nextKey);
    }
    setRenameDraft(null);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setRenameDraft(null);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group/row flex min-w-max border-b border-border/60 transition-colors hover:bg-muted/40',
          status.tone !== 'success' && 'bg-amber-500/4 dark:bg-amber-400/4',
        )}
        role='row'
      >
        <div
          className={cn(
            TREE_COLUMN_CLASS_NAME,
            'sticky left-0 z-10 flex h-10 items-center gap-1 border-r border-border/60 bg-background pr-1 group-hover/row:bg-muted/40',
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <Button
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              disabled={searchFilter !== null}
              size='icon-xs'
              variant='ghost'
              onClick={() => actions.toggleExpanded(path)}
            >
              <ChevronRight
                className={cn(
                  'transition-transform duration-150 motion-reduce:transition-none',
                  isExpanded && 'rotate-90',
                )}
              />
            </Button>
          ) : (
            <span aria-hidden='true' className='block size-6 shrink-0' />
          )}

          {renameDraft !== null ? (
            <Input
              aria-label='Rename key across files'
              autoFocus
              className='h-7 min-w-0 flex-1 px-1.5 font-mono text-base md:text-sm'
              value={renameDraft}
              onBlur={commitRename}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={handleRenameKeyDown}
            />
          ) : (
            <button
              className={cn(
                'min-w-0 flex-1 truncate rounded-sm px-1 text-left font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                isRoot ? 'text-muted-foreground' : 'text-foreground',
                canRename && 'cursor-text',
              )}
              disabled={!canRename}
              title={
                canRename
                  ? `${formatPath(path)} · double-click to rename`
                  : formatPath(path)
              }
              type='button'
              onDoubleClick={() => {
                if (canRename) {
                  setRenameDraft(String(segment));
                }
              }}
              onKeyDown={(event) => {
                if (canRename && (event.key === 'Enter' || event.key === 'F2')) {
                  event.preventDefault();
                  setRenameDraft(String(segment));
                }
              }}
            >
              {isRoot ? 'root' : formatSegment(segment)}
            </button>
          )}

          {status.tone !== 'success' && (
            <StatusBadge className='shrink-0' tone={status.tone}>
              {status.label}
            </StatusBadge>
          )}

          {!isRoot && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={`Actions for ${formatPath(path)}`}
                    className='shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none'
                    size='icon-xs'
                    variant='ghost'
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-48'>
                {canRename && (
                  <DropdownMenuItem
                    onClick={() => setRenameDraft(String(segment))}
                  >
                    <PencilLine />
                    Rename in all files
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard?.writeText(formatDottedPath(path));
                  }}
                >
                  <ClipboardCopy />
                  Copy path
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => actions.removeValueEverywhere(path)}
                >
                  <Trash2 />
                  Delete from all files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              FILE_COLUMN_CLASS_NAME,
              'flex h-10 items-center border-r border-border/40 px-2 last:border-r-0',
              file.id === enteringFile?.id && COLUMN_ENTER_CLASS_NAME,
            )}
            role='cell'
            style={
              file.id === enteringFile?.id && enterDelayMs > 0
                ? { animationDelay: `${enterDelayMs}ms` }
                : undefined
            }
          >
            <ValueCell actions={actions} file={file} files={files} path={path} />
          </div>
        ))}
      </div>

      {isExpanded &&
        childSegments.map((childSegment) => (
          <TreeRow
            key={pathToKey([...path, childSegment])}
            actions={actions}
            depth={depth + 1}
            enteringFile={enteringFile}
            expandedPaths={expandedPaths}
            files={files}
            path={[...path, childSegment]}
            searchFilter={searchFilter}
            staggerIndexByKey={staggerIndexByKey}
          />
        ))}
    </>
  );
}

export { FILE_COLUMN_CLASS_NAME, TREE_COLUMN_CLASS_NAME, TreeRow };
export type { SearchFilter };
