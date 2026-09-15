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
import type { TreeActions } from '@/components/tree/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { countLeaves, type TranslationFile } from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type TreeTableProps = {
  actions: TreeActions;
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
  expandedPaths,
  files,
  onSearchChange,
  searchFilter,
  searchQuery,
}: TreeTableProps) {
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
          expandedPaths={expandedPaths}
          files={files}
          path={[]}
          searchFilter={searchFilter}
        />
      )}
    </div>
  );
}

export { TreeTable };
