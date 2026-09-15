import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VALUE_KINDS, type ValueKind } from '@/lib/json-tree';

function KindSelect({
  className,
  label,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  onChange: (kind: ValueKind) => void;
  value: ValueKind;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as ValueKind)}
    >
      <SelectTrigger aria-label={label} className={className} size='sm'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VALUE_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {kind}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { KindSelect };
