import { useMemo } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  X,
} from 'lucide-react';
import { TreeSearchInput } from '@/components/tree-search-input';
import {
  FILE_COLUMN_CLASS_NAME,
  TREE_COLUMN_CLASS_NAME,
  TreeRow,
  type SearchFilter,
} from '@/components/tree/tree-row';
import {
  COLUMN_ENTER_CLASS_NAME,
  type EnteringFile,
  type TreeActions,
} from '@/components/tree/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  collectChildSegments,
  countLeaves,
  pathToKey,
  type JsonPath,
  type TranslationFile,
} from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type TreeTableProps = {
  actions: TreeActions;
  enteringFile: EnteringFile | null;
  expandedPaths: Set<string>;
  files: TranslationFile[];
  onSearchChange: (value: string) => void;
  searchFilter: SearchFilter | null;
  searchQuery: string;
};

function IconAction({
  label,
  onClick,
  children,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button aria-label={label} size='icon-xs' variant='ghost' onClick={onClick} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function TreeTable({
  actions,
  enteringFile,
  expandedPaths,
  files,
  onSearchChange,
  searchFilter,
  searchQuery,
}: TreeTableProps) {
  // Visible rows in display order, only needed to stagger an entering column.
  const staggerIndexByKey = useMemo(() => {
    if (!enteringFile?.stagger) {
      return null;
    }

    const indexByKey = new Map<string, number>();
    const walk = (path: JsonPath) => {
      const key = pathToKey(path);
      if (searchFilter && !searchFilter.visiblePathKeys.has(key)) {
        return;
      }
      indexByKey.set(key, indexByKey.size);

      const childSegments = collectChildSegments(files, path).filter(
        (segment) =>
          !searchFilter ||
          searchFilter.visiblePathKeys.has(pathToKey([...path, segment])),
      );
      const isExpanded = searchFilter
        ? childSegments.length > 0
        : expandedPaths.has(key);
      if (isExpanded) {
        childSegments.forEach((segment) => walk([...path, segment]));
      }
    };
    walk([]);
    return indexByKey;
  }, [enteringFile, expandedPaths, files, searchFilter]);

  return (
    <div className='h-full overflow-auto' role='table'>
      <div className='sticky top-0 z-20 flex min-w-max border-b bg-background'>
        <div
          className={cn(
            TREE_COLUMN_CLASS_NAME,
            'sticky left-0 z-30 flex items-center gap-1 border-r border-border/60 bg-background p-2',
          )}
        >
          <TreeSearchInput
            className='flex-1'
            matchCount={searchFilter?.matchCount ?? null}
            value={searchQuery}
            onValueChange={onSearchChange}
          />
          <IconAction label='Expand all' onClick={actions.expandAll}>
            <ChevronsUpDown />
          </IconAction>
          <IconAction label='Collapse all' onClick={actions.collapseAll}>
            <ChevronsDownUp />
          </IconAction>
        </div>

        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              FILE_COLUMN_CLASS_NAME,
              'flex items-center justify-between gap-2 border-r border-border/40 px-3 py-2 last:border-r-0',
              file.id === enteringFile?.id && COLUMN_ENTER_CLASS_NAME,
            )}
          >
            <div className='min-w-0'>
              <p className='truncate text-sm font-medium'>{file.fileName}</p>
              <p className='text-xs text-muted-foreground'>
                <span className='tabular-nums'>{countLeaves(file.data)}</span>{' '}
                values
              </p>
            </div>
            <div className='flex shrink-0 items-center'>
              <IconAction
                label={`Download ${file.fileName}`}
                onClick={() => actions.saveFile(file)}
              >
                <Download />
              </IconAction>
              <IconAction
                label={`Remove ${file.fileName}`}
                onClick={() => actions.removeFile(file.id)}
              >
                <X />
              </IconAction>
            </div>
          </div>
        ))}
      </div>

      {searchFilter?.matchCount === 0 ? (
        <div className='sticky left-0 p-6 text-sm text-muted-foreground'>
          No keys or paths match &ldquo;{searchQuery.trim()}&rdquo;.
        </div>
      ) : (
        <TreeRow
          actions={actions}
          enteringFile={enteringFile}
          expandedPaths={expandedPaths}
          files={files}
          path={[]}
          searchFilter={searchFilter}
          staggerIndexByKey={staggerIndexByKey}
        />
      )}
    </div>
  );
}

export { TreeTable };
