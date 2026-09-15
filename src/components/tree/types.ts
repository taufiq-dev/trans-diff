import type {
  JsonPath,
  JsonValue,
  TranslationFile,
  ValueKind,
} from '@/lib/json-tree';

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
};
