import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type FaqItem = {
  answer: ReactNode;
  id: string;
  question: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'privacy',
    question: 'Is my JSON sent to a server?',
    answer: (
      <>
        <p>
          No. Trans Diff runs entirely in your browser. Files you upload or
          paste are parsed on your machine, kept in memory while the tab is
          open, and never uploaded anywhere. There is no backend, no account,
          and no analytics on your content.
        </p>
        <p>
          Refreshing or closing the tab clears everything. Nothing is written
          to disk unless you download a file.
        </p>
      </>
    ),
  },
  {
    id: 'not-synced',
    question: 'What does "not synced" mean?',
    answer: (
      <p>
        A path is not synced when it exists in some files but is missing in
        others, or when the files disagree on its type (for example a string
        in one file and an object in another). The header badge counts every
        path with one of these problems, and each affected row is flagged in
        the tree.
      </p>
    ),
  },
  {
    id: 'formats',
    question: 'Which files can I load?',
    answer: (
      <p>
        Any valid JSON file. Each file becomes a column, and nested objects
        and arrays are merged into one tree so you can compare the same key
        across every locale. Load as many files as you like, by upload, drag
        and drop, or pasting raw JSON.
      </p>
    ),
  },
  {
    id: 'rename',
    question: 'Does renaming a key change every file?',
    answer: (
      <p>
        Yes. Renaming from the tree column renames the key in every loaded
        file that has it, so the files stay aligned. Editing a value, changing
        its type, or deleting it from a cell only affects that file.
      </p>
    ),
  },
  {
    id: 'translate',
    question: 'How does auto translate work?',
    answer: (
      <>
        <p>
          It uses the Translator API built into Chrome desktop. The first time
          you use a language pair, Chrome downloads a language pack and then
          translates on your device. This app never sends text to a
          translation service.
        </p>
        <p>
          In browsers without the Translator API, the translate action is
          disabled and everything else works normally.
        </p>
      </>
    ),
  },
  {
    id: 'save',
    question: 'How do I get my changes back out?',
    answer: (
      <p>
        Use the download action on a file column. It saves that file&rsquo;s
        current JSON, pretty-printed with two-space indentation, so you can
        drop it back into your project.
      </p>
    ),
  },
];

function Faq({ className }: { className?: string }) {
  return (
    <Accordion className={className}>
      {FAQ_ITEMS.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent className='text-muted-foreground'>
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function FaqDialogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label='FAQ'
              size='icon'
              variant='ghost'
              onClick={() => setOpen(true)}
            />
          }
        >
          <CircleHelp />
        </TooltipTrigger>
        <TooltipContent>FAQ</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>FAQ</DialogTitle>
            <DialogDescription>
              How Trans Diff handles your files.
            </DialogDescription>
          </DialogHeader>
          <Faq className='-mx-1 max-h-[70svh] overflow-y-auto px-1' />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { FAQ_ITEMS, Faq, FaqDialogButton };
