import type {
  JsonPath,
  JsonValue,
  TranslationFile,
  ValueKind,
} from '@/lib/json-tree';

// A file column that has just been added and should animate in. `stagger`
// delays each row slightly (used after a translation completes).
export type EnteringFile = {
  id: string;
  stagger: boolean;
};

export const COLUMN_ENTER_CLASS_NAME =
  'animate-in fade-in-0 slide-in-from-right-[6px] fill-mode-both duration-200 ease-out-quint motion-reduce:slide-in-from-right-0';

// Stagger step and cap for a translated column's cells (~200ms total).
export const COLUMN_STAGGER_STEP_MS = 20;
export const COLUMN_STAGGER_MAX_ROWS = 10;

export type TreeActions = {
  addArrayItem: (fileId: string, path: JsonPath, kind: ValueKind) => void;
  addObjectKey: (
    fileId: string,
    path: JsonPath,
    key: string,
    kind: ValueKind,
  ) => boolean;
  collapseAll: () => void;
  duplicateArrayItem: (fileId: string, path: JsonPath) => void;
  expandAll: () => void;
  moveArrayItem: (fileId: string, path: JsonPath, direction: -1 | 1) => void;
  removeFile: (fileId: string) => void;
  removeValue: (fileId: string, path: JsonPath) => void;
  removeValueEverywhere: (path: JsonPath) => void;
  renameKey: (path: JsonPath, nextKey: string) => void;
  saveFile: (file: TranslationFile) => void;
  setKind: (fileId: string, path: JsonPath, kind: ValueKind) => void;
  setValue: (fileId: string, path: JsonPath, value: JsonValue) => void;
  toggleExpanded: (path: JsonPath) => void;
  // Expands or collapses a path together with every descendant.
  toggleSubtree: (path: JsonPath) => void;
};
