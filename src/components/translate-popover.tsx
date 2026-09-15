import { useMemo } from 'react';
import { ArrowLeftRight, Languages, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TRANSLATOR_LANGUAGES,
  type TranslationJob,
} from '@/lib/browser-translator';
import type { TranslationFile } from '@/lib/json-tree';

type TranslatePopoverProps = {
  files: TranslationFile[];
  isSupported: boolean;
  job: TranslationJob | null;
  onSourceFileChange: (fileId: string) => void;
  onSourceLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
  onTranslate: () => void;
  sourceFileId: string;
  sourceLanguage: string;
  targetLanguage: string;
};

const LANGUAGE_ITEMS = Object.fromEntries(
  TRANSLATOR_LANGUAGES.map((language) => [language.code, language.label]),
);

const describeJob = (job: TranslationJob): string => {
  if (job.phase === 'checking') {
    return 'Checking language availability…';
  }
  if (job.phase === 'downloading') {
    return `Downloading language pack${
      job.downloadProgress === null ? '' : ` · ${job.downloadProgress}%`
    }`;
  }
  return `Translating ${job.completed}/${job.total} strings`;
};

function LanguageSelect({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (language: string) => void;
  value: string;
}) {
  return (
    <div className='grid min-w-0 flex-1 gap-1'>
      <Label className='text-xs text-muted-foreground' htmlFor={id}>
        {label}
      </Label>
      <Select
        items={LANGUAGE_ITEMS}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onChange(nextValue);
          }
        }}
      >
        <SelectTrigger className='w-full' id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRANSLATOR_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TranslatePopover({
  files,
  isSupported,
  job,
  onSourceFileChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onTranslate,
  sourceFileId,
  sourceLanguage,
  targetLanguage,
}: TranslatePopoverProps) {
  const fileItems = useMemo(
    () => Object.fromEntries(files.map((file) => [file.id, file.fileName])),
    [files],
  );
  const sameLanguage = sourceLanguage === targetLanguage;
  const canTranslate =
    isSupported && files.length > 0 && !sameLanguage && job === null;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' />}>
        {job ? <LoaderCircle className='animate-spin' /> : <Languages />}
        <span className='hidden sm:inline'>Translate</span>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-80 gap-3'>
        <PopoverHeader>
          <PopoverTitle>Translate a file</PopoverTitle>
          <PopoverDescription>
            Adds a new column using Chrome&rsquo;s built-in, on-device
            translator.
          </PopoverDescription>
        </PopoverHeader>

        <div className='grid gap-1'>
          <Label className='text-xs text-muted-foreground' htmlFor='translate-source'>
            Source file
          </Label>
          <Select
            items={fileItems}
            value={sourceFileId}
            onValueChange={(nextValue) => {
              if (nextValue) {
                onSourceFileChange(nextValue);
              }
            }}
          >
            <SelectTrigger className='w-full' id='translate-source'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {files.map((file) => (
                <SelectItem key={file.id} value={file.id}>
                  {file.fileName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-end gap-1.5'>
          <LanguageSelect
            id='translate-from'
            label='From'
            value={sourceLanguage}
            onChange={onSourceLanguageChange}
          />
          <Button
            aria-label='Swap languages'
            className='mb-0.5 shrink-0'
            size='icon-sm'
            variant='ghost'
            onClick={() => {
              onSourceLanguageChange(targetLanguage);
              onTargetLanguageChange(sourceLanguage);
            }}
          >
            <ArrowLeftRight />
          </Button>
          <LanguageSelect
            id='translate-to'
            label='To'
            value={targetLanguage}
            onChange={onTargetLanguageChange}
          />
        </div>

        <p className='min-h-4 text-xs text-muted-foreground'>
          {job
            ? describeJob(job)
            : !isSupported
              ? 'Requires Chrome desktop with the Translator API. Unavailable in this browser.'
              : sameLanguage
                ? 'Choose two different languages.'
                : 'The first run for a language pair downloads a language pack.'}
        </p>

        <Button disabled={!canTranslate} onClick={onTranslate}>
          {job ? <LoaderCircle className='animate-spin' /> : <Languages />}
          {job ? 'Translating…' : 'Translate'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export { TranslatePopover };
