import type { JsonValue } from '@/lib/json-tree';
import de from '../../de.json';
import en from '../../en.json';
import fr from '../../fr.json';

type SampleFile = {
  data: JsonValue;
  fileName: string;
};

export const SAMPLE_FILES: SampleFile[] = [
  { data: en, fileName: 'en.json' },
  { data: de, fileName: 'de.json' },
  { data: fr, fileName: 'fr.json' },
];
