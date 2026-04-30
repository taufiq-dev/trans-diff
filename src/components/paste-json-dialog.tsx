import {
  lazy,
  Suspense,
  type FormEvent,
} from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { debugPasteDialog } from '@/lib/debug';

const JsonCodeEditor = lazy(() =>
  import('@/components/json-code-editor').then((module) => ({
    default: module.JsonCodeEditor,
  })),
);

type PasteJsonDialogProps = {
  fileName: string;
  jsonContent: string;
  jsonError: string | null;
  onFileNameChange: (fileName: string) => void;
  onJsonContentChange: (jsonContent: string) => void;
  onJsonErrorChange: (jsonError: string | null) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
};

function PasteJsonDialog({
  fileName,
  jsonContent,
  jsonError,
  onFileNameChange,
  onJsonContentChange,
  onJsonErrorChange,
  onOpenChange,
  onSubmit,
  open,
}: PasteJsonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='flex h-[min(720px,calc(100svh-2rem))] max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-3xl'
        onAnimationEnd={(event) => {
          debugPasteDialog('dialog-animation-end', {
            animationName: event.animationName,
            open,
          });
        }}
        onAnimationStart={(event) => {
          debugPasteDialog('dialog-animation-start', {
            animationName: event.animationName,
            open,
          });
        }}
      >
        <form className='flex min-h-0 flex-1 flex-col' onSubmit={onSubmit}>
          <DialogHeader className='shrink-0 p-4'>
            <DialogTitle>Paste JSON</DialogTitle>
            <DialogDescription>
              Add an existing JSON file by pasting its raw content.
            </DialogDescription>
          </DialogHeader>
          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4'>
            <div className='grid shrink-0 gap-2'>
              <Label htmlFor='paste-file-name'>File name</Label>
              <Input
                id='paste-file-name'
                value={fileName}
                onChange={(event) => onFileNameChange(event.target.value)}
                placeholder='id.json'
              />
            </div>
            <div className='grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2'>
              <Label htmlFor='paste-json-content'>JSON content</Label>
              <Suspense
                fallback={
                  <div className='h-full min-h-0 rounded-lg border border-input bg-background' />
                }
              >
                <JsonCodeEditor
                  id='paste-json-content'
                  ariaLabel='JSON content'
                  className='h-full'
                  invalid={Boolean(jsonError)}
                  value={jsonContent}
                  onChange={(nextValue) => {
                    onJsonContentChange(nextValue);
                    onJsonErrorChange(null);
                  }}
                />
              </Suspense>
              <div className='min-h-5 text-xs'>
                {jsonError ? (
                  <span className='text-destructive'>{jsonError}</span>
                ) : (
                  <span className='text-muted-foreground'>
                    The pasted content must parse as JSON.
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className='mx-0 mb-0 shrink-0 rounded-b-xl px-4 pb-4 pt-3'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit'>
              <Plus />
              Add pasted JSON
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PasteJsonDialog };
