import {
  ClipboardPaste,
  GitCompareArrows,
  Languages,
  LockKeyhole,
  PencilLine,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Faq } from '@/components/faq';
import { GITHUB_REPOSITORY_URL } from '@/components/app-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LandingProps = {
  fileInputId: string;
  isDragging: boolean;
  onLoadSample: () => void;
  onPaste: () => void;
};

const FEATURES = [
  {
    description:
      'Every locale file becomes a column in one merged tree, so missing keys and type mismatches are flagged where they happen.',
    icon: GitCompareArrows,
    title: 'Diff by structure',
  },
  {
    description:
      'Edit strings, numbers, booleans and nulls inline. Add, rename, reorder and delete keys or array items without touching raw JSON.',
    icon: PencilLine,
    title: 'Edit in place',
  },
  {
    description:
      'Create a translated column from any file with the on-device Translator API in Chrome. No API keys, no upload.',
    icon: Languages,
    title: 'Translate locally',
  },
];

function Landing({ fileInputId, isDragging, onLoadSample, onPaste }: LandingProps) {
  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-14 px-4 py-12 sm:py-16'>
      <section className='flex flex-col items-center gap-6 text-center'>
        <span className='inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground'>
          <LockKeyhole className='size-3.5' />
          Runs entirely in your browser. Nothing is uploaded.
        </span>
        <div className='flex flex-col gap-3'>
          <h1 className='font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
            Keep your JSON translation files in sync
          </h1>
          <p className='mx-auto max-w-xl text-base text-muted-foreground text-pretty'>
            Load two or more locale files, compare them side by side as one
            tree, fix what&rsquo;s missing, and download the result.
          </p>
        </div>

        <div
          className={cn(
            'flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border bg-card px-6 py-10 transition-[border-color,background-color]',
            isDragging && 'border-primary bg-muted/60',
          )}
        >
          <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
            <Upload className='size-5 text-muted-foreground' />
          </div>
          <div>
            <p className='font-medium'>Drop JSON files anywhere on this page</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              or pick them from disk, or paste raw JSON
            </p>
          </div>
          <div className='flex flex-wrap justify-center gap-2'>
            <label
              className={cn(buttonVariants({ size: 'lg' }), 'cursor-pointer')}
              htmlFor={fileInputId}
            >
              <Upload />
              Select files
            </label>
            <Button size='lg' variant='outline' onClick={onPaste}>
              <ClipboardPaste />
              Paste JSON
            </Button>
            <Button size='lg' variant='ghost' onClick={onLoadSample}>
              <Sparkles />
              Try a sample
            </Button>
          </div>
        </div>
      </section>

      <section className='grid gap-4 sm:grid-cols-3'>
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className='flex flex-col gap-2 rounded-xl border bg-card p-4'
          >
            <feature.icon className='size-5 text-muted-foreground' />
            <h2 className='text-sm font-medium'>{feature.title}</h2>
            <p className='text-sm text-muted-foreground'>{feature.description}</p>
          </div>
        ))}
      </section>

      <section className='flex flex-col gap-2'>
        <h2 className='font-heading text-xl font-semibold tracking-tight'>FAQ</h2>
        <Faq />
      </section>

      <footer className='flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground'>
        <span>MIT licensed. Free to use and self-host.</span>
        <a
          className='underline underline-offset-4 hover:text-foreground'
          href={GITHUB_REPOSITORY_URL}
          rel='noreferrer'
          target='_blank'
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}

export { Landing };
