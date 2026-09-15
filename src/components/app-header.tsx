import type { ReactNode } from 'react';
import {
  ClipboardPaste,
  Moon,
  Sun,
  Upload,
} from 'lucide-react';
import { FaqDialogButton } from '@/components/faq';
import { GithubMarkIcon } from '@/components/github-mark-icon';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const GITHUB_REPOSITORY_URL = 'https://github.com/taufiq-dev/trans-diff';

type AppHeaderProps = {
  fileCount: number;
  fileInputId: string;
  notSyncedCount: number;
  onPaste: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  translateSlot?: ReactNode;
};

function AppHeader({
  fileCount,
  fileInputId,
  notSyncedCount,
  onPaste,
  onToggleTheme,
  theme,
  translateSlot,
}: AppHeaderProps) {
  return (
    <header className='sticky top-0 z-40 flex h-13 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur'>
      <a className='flex items-center gap-2' href='/'>
        <img alt='' className='size-6' src='/trans-diff.svg' />
        <span className='font-heading text-base font-semibold tracking-tight'>
          Trans Diff
        </span>
      </a>

      {fileCount > 0 && (
        <div className='hidden items-center gap-1.5 sm:flex'>
          <Badge variant='secondary'>
            <span className='tabular-nums'>{fileCount}</span>{' '}
            {fileCount === 1 ? 'file' : 'files'}
          </Badge>
          <StatusBadge tone={notSyncedCount > 0 ? 'warning' : 'success'}>
            {notSyncedCount > 0 ? (
              <>
                <span className='tabular-nums'>{notSyncedCount}</span> not synced
              </>
            ) : (
              'All synced'
            )}
          </StatusBadge>
        </div>
      )}

      <div className='ml-auto flex items-center gap-1.5'>
        {translateSlot}
        <label
          className={cn(
            buttonVariants({ variant: fileCount > 0 ? 'outline' : 'default' }),
            'cursor-pointer',
          )}
          htmlFor={fileInputId}
        >
          <Upload />
          <span className='hidden sm:inline'>Upload</span>
        </label>
        <Button variant='outline' onClick={onPaste}>
          <ClipboardPaste />
          <span className='hidden sm:inline'>Paste</span>
        </Button>

        <Separator className='mx-1 h-5!' orientation='vertical' />

        <FaqDialogButton />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={
                  theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
                }
                size='icon'
                variant='ghost'
                onClick={onToggleTheme}
              />
            }
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </TooltipTrigger>
          <TooltipContent>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                aria-label='View Trans Diff on GitHub'
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                href={GITHUB_REPOSITORY_URL}
                rel='noreferrer'
                target='_blank'
              />
            }
          >
            <GithubMarkIcon />
          </TooltipTrigger>
          <TooltipContent>GitHub</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

export { AppHeader, GITHUB_REPOSITORY_URL };
