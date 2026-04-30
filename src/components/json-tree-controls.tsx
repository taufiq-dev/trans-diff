import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { selectControlClassName } from '@/components/select-control';
import { TRANSLATOR_LANGUAGES } from '@/lib/browser-translator';
import { VALUE_KINDS, type ValueKind } from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type StatusTone = 'default' | 'danger' | 'warning' | 'success';

function SelectIndicator({ className }: { className?: string }) {
  return (
    <ChevronDown
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
        className,
      )}
    />
  );
}

function KindSelect({
  value,
  onChange,
  label,
}: {
  value: ValueKind;
  onChange: (kind: ValueKind) => void;
  label: string;
}) {
  return (
    <div className='relative inline-block'>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as ValueKind)}
        className={cn(
          selectControlClassName,
          'h-8 min-w-28 text-xs font-medium text-muted-foreground',
        )}
      >
        {VALUE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <SelectIndicator className='size-3.5' />
    </div>
  );
}

function LanguageSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (language: string) => void;
  label: string;
}) {
  return (
    <div className='relative inline-block'>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(selectControlClassName, 'h-9 text-sm font-medium')}
      >
        {TRANSLATOR_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
      <SelectIndicator />
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2 text-xs font-medium',
        tone === 'default' && 'bg-muted text-muted-foreground',
        tone === 'danger' && 'bg-destructive/10 text-destructive',
        tone === 'warning' && 'bg-amber-500/10 text-amber-700',
        tone === 'success' && 'bg-emerald-500/10 text-emerald-700',
      )}
    >
      {children}
    </span>
  );
}

export {
  KindSelect,
  LanguageSelect,
  SelectIndicator,
  StatusBadge,
};
