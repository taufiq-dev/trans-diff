import {
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Languages,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
type PathSegment = string | number;
type JsonPath = PathSegment[];
type ValueKind = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
type TranslatorAvailability = 'available' | 'downloadable' | 'unavailable';

type TranslationFile = {
  id: string;
  data: JsonValue;
  fileName: string;
};

type AddDraft = {
  key: string;
  kind: ValueKind;
};

type LanguageOption = {
  code: string;
  label: string;
};

type TranslationJob = {
  completed: number;
  downloadProgress: number | null;
  fileId: string;
  phase: 'checking' | 'downloading' | 'translating';
  total: number;
};

type BuiltInTranslator = {
  destroy?: () => void;
  translate: (input: string) => Promise<string>;
};

type BuiltInTranslatorFactory = {
  availability: (options: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<TranslatorAvailability | string>;
  create: (options: {
    monitor?: (monitor: EventTarget) => void;
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<BuiltInTranslator>;
};

const MISSING = Symbol('missing');
type Missing = typeof MISSING;

const TRANSLATOR_LANGUAGES: LanguageOption[] = [
  { code: 'ar', label: 'Arabic' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'bn', label: 'Bengali' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hr', label: 'Croatian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'iw', label: 'Hebrew' },
  { code: 'ja', label: 'Japanese' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ko', label: 'Korean' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'mr', label: 'Marathi' },
  { code: 'nl', label: 'Dutch' },
  { code: 'no', label: 'Norwegian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)' },
];

const VALUE_KINDS: ValueKind[] = [
  'string',
  'number',
  'boolean',
  'null',
  'object',
  'array',
];

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJsonValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return Number.isFinite(value) || typeof value !== 'number';
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isJsonObject(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

const cloneJson = <T extends JsonValue>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const getTranslatorFactory = (): BuiltInTranslatorFactory | null => {
  if (typeof self === 'undefined' || !('Translator' in self)) {
    return null;
  }

  return (self as unknown as { Translator: BuiltInTranslatorFactory }).Translator;
};

const countTranslatableStrings = (value: JsonValue): number => {
  if (typeof value === 'string') {
    return value.trim() ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>(
      (total, item) => total + countTranslatableStrings(item),
      0,
    );
  }

  if (isJsonObject(value)) {
    return Object.values(value).reduce<number>(
      (total, item) => total + countTranslatableStrings(item),
      0,
    );
  }

  return 0;
};

const translateJsonValue = async (
  value: JsonValue,
  translateText: (input: string) => Promise<string>,
  onTranslatedString: () => void,
): Promise<JsonValue> => {
  if (typeof value === 'string') {
    if (!value.trim()) {
      return value;
    }

    const translated = await translateText(value);
    onTranslatedString();
    return translated;
  }

  if (Array.isArray(value)) {
    const translatedItems: JsonArray = [];

    for (const item of value) {
      translatedItems.push(
        await translateJsonValue(item, translateText, onTranslatedString),
      );
    }

    return translatedItems;
  }

  if (isJsonObject(value)) {
    const translatedObject: JsonObject = {};

    for (const [key, item] of Object.entries(value)) {
      translatedObject[key] = await translateJsonValue(
        item,
        translateText,
        onTranslatedString,
      );
    }

    return translatedObject;
  }

  return value;
};

const getTranslatedFileName = (fileName: string, targetLanguage: string): string =>
  fileName.match(/\.json$/i)
    ? fileName.replace(/\.json$/i, `.${targetLanguage}.json`)
    : `${fileName}.${targetLanguage}.json`;

const createDefaultValue = (kind: ValueKind): JsonValue => {
  switch (kind) {
    case 'array':
      return [];
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'number':
      return 0;
    case 'object':
      return {};
    case 'string':
      return '';
  }
};

const getValueKind = (value: JsonValue): ValueKind => {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (isJsonObject(value)) {
    return 'object';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  return 'boolean';
};

const coerceValue = (value: JsonValue | Missing, kind: ValueKind): JsonValue => {
  if (value === MISSING) {
    return createDefaultValue(kind);
  }

  if (kind === 'string') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  if (kind === 'number') {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    }

    return 0;
  }

  if (kind === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return Boolean(value);
  }

  return createDefaultValue(kind);
};

const getValueAtPath = (root: JsonValue, path: JsonPath): JsonValue | Missing => {
  let current: JsonValue | undefined = root;

  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || segment >= current.length) {
        return MISSING;
      }
      current = current[segment];
      continue;
    }

    if (!isJsonObject(current) || !(segment in current)) {
      return MISSING;
    }
    current = current[segment];
  }

  return current ?? MISSING;
};

const defaultContainerFor = (segment: PathSegment | undefined): JsonValue =>
  typeof segment === 'number' ? [] : {};

const setValueAtPath = (
  current: JsonValue | Missing,
  path: JsonPath,
  value: JsonValue,
): JsonValue => {
  if (path.length === 0) {
    return value;
  }

  const [segment, ...rest] = path;

  if (typeof segment === 'number') {
    const next = Array.isArray(current) ? [...current] : [];
    next[segment] = setValueAtPath(
      next[segment] ?? defaultContainerFor(rest[0]),
      rest,
      value,
    );
    return next;
  }

  const next = isJsonObject(current) ? { ...current } : {};
  next[segment] = setValueAtPath(
    next[segment] ?? defaultContainerFor(rest[0]),
    rest,
    value,
  );
  return next;
};

const removeValueAtPath = (current: JsonValue, path: JsonPath): JsonValue => {
  if (path.length === 0) {
    return {};
  }

  const [segment, ...rest] = path;

  if (typeof segment === 'number') {
    if (!Array.isArray(current)) {
      return current;
    }

    const next = [...current];
    if (rest.length === 0) {
      next.splice(segment, 1);
    } else {
      next[segment] = removeValueAtPath(next[segment], rest);
    }
    return next;
  }

  if (!isJsonObject(current) || !(segment in current)) {
    return current;
  }

  const next = { ...current };
  if (rest.length === 0) {
    delete next[segment];
  } else {
    next[segment] = removeValueAtPath(next[segment], rest);
  }
  return next;
};

const renameKeyAtPath = (
  current: JsonValue,
  path: JsonPath,
  nextKey: string,
): JsonValue => {
  const oldKey = path[path.length - 1];
  const parentPath = path.slice(0, -1);

  if (typeof oldKey !== 'string' || !nextKey.trim()) {
    return current;
  }

  const parent = getValueAtPath(current, parentPath);
  if (!isJsonObject(parent) || !(oldKey in parent)) {
    return current;
  }

  if (nextKey !== oldKey && nextKey in parent) {
    return current;
  }

  const renamedParent = Object.entries(parent).reduce<JsonObject>(
    (acc, [key, value]) => {
      acc[key === oldKey ? nextKey : key] = value;
      return acc;
    },
    {},
  );

  return setValueAtPath(current, parentPath, renamedParent);
};

const moveArrayItem = (
  current: JsonValue,
  parentPath: JsonPath,
  index: number,
  direction: -1 | 1,
): JsonValue => {
  const parent = getValueAtPath(current, parentPath);
  const nextIndex = index + direction;

  if (!Array.isArray(parent) || nextIndex < 0 || nextIndex >= parent.length) {
    return current;
  }

  const next = [...parent];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return setValueAtPath(current, parentPath, next);
};

const insertArrayItem = (
  current: JsonValue,
  path: JsonPath,
  value: JsonValue,
): JsonValue => {
  const existing = getValueAtPath(current, path);
  const next = Array.isArray(existing) ? [...existing, value] : [value];
  return setValueAtPath(current, path, next);
};

const duplicateValue = (
  current: JsonValue,
  parentPath: JsonPath,
  index: number,
): JsonValue => {
  const parent = getValueAtPath(current, parentPath);

  if (!Array.isArray(parent) || !(index in parent)) {
    return current;
  }

  const next = [...parent];
  next.splice(index + 1, 0, cloneJson(parent[index]));
  return setValueAtPath(current, parentPath, next);
};

const pathToKey = (path: JsonPath): string => JSON.stringify(path);

const draftKey = (fileId: string, path: JsonPath): string =>
  `${fileId}:${pathToKey(path)}`;

const formatPath = (path: JsonPath): string => {
  if (path.length === 0) {
    return '$';
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }

    return `${acc}.${segment}`;
  }, '$');
};

const formatSegment = (segment: PathSegment | undefined): string => {
  if (segment === undefined) {
    return 'Root';
  }

  return typeof segment === 'number' ? `[${segment}]` : segment;
};

const countLeaves = (value: JsonValue): number => {
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (total, item) => total + countLeaves(item),
      0,
    );
  }

  if (isJsonObject(value)) {
    return Object.values(value).reduce<number>(
      (total, item) => total + countLeaves(item),
      0,
    );
  }

  return 1;
};

const collectChildSegments = (
  files: TranslationFile[],
  path: JsonPath,
): PathSegment[] => {
  const segments = new Set<PathSegment>();

  for (const file of files) {
    const value = getValueAtPath(file.data, path);

    if (Array.isArray(value)) {
      value.forEach((_, index) => segments.add(index));
    } else if (isJsonObject(value)) {
      Object.keys(value).forEach((key) => segments.add(key));
    }
  }

  return Array.from(segments).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    if (typeof a === 'number') {
      return -1;
    }

    if (typeof b === 'number') {
      return 1;
    }

    return a.localeCompare(b);
  });
};

const getSuggestedKind = (
  files: TranslationFile[],
  path: JsonPath,
): ValueKind => {
  for (const file of files) {
    const value = getValueAtPath(file.data, path);
    if (value !== MISSING) {
      return getValueKind(value);
    }
  }

  return 'string';
};

const getPathStatus = (
  files: TranslationFile[],
  path: JsonPath,
): { label: string; tone: 'default' | 'danger' | 'warning' | 'success' } => {
  const values = files.map((file) => getValueAtPath(file.data, path));
  const missingCount = values.filter((value) => value === MISSING).length;

  if (missingCount === values.length) {
    return { label: 'Missing', tone: 'danger' };
  }

  if (missingCount > 0) {
    return { label: `${missingCount} missing`, tone: 'warning' };
  }

  const kinds = new Set(
    values.map((value) => getValueKind(value as JsonValue)),
  );

  if (kinds.size > 1) {
    return { label: 'Type mismatch', tone: 'warning' };
  }

  return { label: 'Synced', tone: 'success' };
};

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
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as ValueKind)}
      className='h-8 rounded-3xl border border-transparent bg-input/50 px-3 text-xs font-medium text-muted-foreground outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
    >
      {VALUE_KINDS.map((kind) => (
        <option key={kind} value={kind}>
          {kind}
        </option>
      ))}
    </select>
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
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className='h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-medium outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
    >
      {TRANSLATOR_LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'default' | 'danger' | 'warning' | 'success';
  children: React.ReactNode;
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

export default function Home() {
  const [files, setFiles] = useState<TranslationFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [selectedSourceFileId, setSelectedSourceFileId] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [translationJob, setTranslationJob] = useState<TranslationJob | null>(
    null,
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['[]']),
  );
  const [addDrafts, setAddDrafts] = useState<Record<string, AddDraft>>({});
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const isTranslatorSupported = getTranslatorFactory() !== null;

  const gridTemplateColumns = useMemo(
    () => `minmax(320px, 1.1fr) repeat(${files.length}, minmax(340px, 1fr))`,
    [files.length],
  );
  const selectedSourceFile =
    files.find((file) => file.id === selectedSourceFileId) ?? files[0] ?? null;

  const updateFileData = (fileId: string, updater: (data: JsonValue) => JsonValue) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === fileId ? { ...file, data: updater(file.data) } : file,
      ),
    );
  };

  const handleFilesSelected = (selectedFiles: File[]): void => {
    const jsonFiles = selectedFiles.filter(
      (file) =>
        file.type === 'application/json' ||
        file.name.toLowerCase().endsWith('.json'),
    );

    if (jsonFiles.length !== selectedFiles.length) {
      setError('Only JSON files can be added.');
    }

    for (const file of jsonFiles) {
      const reader = new FileReader();
      reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
        try {
          const parsed = JSON.parse(String(readerEvent.target?.result ?? ''));

          if (!isJsonValue(parsed)) {
            throw new Error('The file contains values that are not valid JSON.');
          }

          const nextFile = {
            data: parsed,
            fileName: file.name,
            id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          };

          setFiles((currentFiles) => [...currentFiles, nextFile]);
          setSelectedSourceFileId((currentId) => currentId || nextFile.id);
          setExpandedPaths((currentPaths) => new Set(currentPaths).add('[]'));
          setError(null);
        } catch (uploadError) {
          setError(
            `Error parsing JSON from ${file.name}: ${
              uploadError instanceof Error
                ? uploadError.message
                : 'Unknown error'
            }`,
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    handleFilesSelected(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDraggingJson(false);
    handleFilesSelected(Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingJson(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingJson(false);
    }
  };

  const handleSave = (file: TranslationFile) => {
    const blob = new Blob([JSON.stringify(file.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modified_${file.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeFile = (fileId: string) => {
    setFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== fileId),
    );
    setSelectedSourceFileId((currentId) =>
      currentId === fileId ? '' : currentId,
    );
  };

  const handleTranslateSelectedFile = () => {
    if (!selectedSourceFile) {
      setError('Add a JSON file before creating a translation.');
      return;
    }

    void handleTranslateFile(selectedSourceFile);
  };

  const handleTranslateFile = async (file: TranslationFile) => {
    const translatorFactory = getTranslatorFactory();

    if (!translatorFactory) {
      setError('Auto translate is not available in this browser.');
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setError('Choose different source and target languages.');
      return;
    }

    const total = countTranslatableStrings(file.data);

    if (total === 0) {
      setError(`${file.fileName} has no non-empty string values to translate.`);
      return;
    }

    let translator: BuiltInTranslator | null = null;
    setError(null);
    setTranslationJob({
      completed: 0,
      downloadProgress: null,
      fileId: file.id,
      phase: 'checking',
      total,
    });

    try {
      const availability = await translatorFactory.availability({
        sourceLanguage,
        targetLanguage,
      });

      if (availability === 'unavailable') {
        throw new Error(
          `Translation from ${sourceLanguage} to ${targetLanguage} is not available in this browser.`,
        );
      }

      setTranslationJob((job) =>
        job
          ? {
              ...job,
              phase:
                availability === 'downloadable' ? 'downloading' : 'translating',
            }
          : job,
      );

      translator = await translatorFactory.create({
        sourceLanguage,
        targetLanguage,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            const progressEvent = event as ProgressEvent;
            const loaded = progressEvent.loaded;
            const totalBytes = progressEvent.total;
            const normalizedProgress =
              totalBytes > 0 ? loaded / totalBytes : loaded;
            const downloadProgress =
              normalizedProgress <= 1
                ? Math.round(normalizedProgress * 100)
                : Math.round(normalizedProgress);

            setTranslationJob((job) =>
              job
                ? {
                    ...job,
                    downloadProgress,
                    phase: 'downloading',
                  }
                : job,
            );
          });
        },
      });

      setTranslationJob((job) =>
        job ? { ...job, downloadProgress: null, phase: 'translating' } : job,
      );

      const translatedData = await translateJsonValue(
        file.data,
        (text) => translator?.translate(text) ?? Promise.resolve(text),
        () =>
          setTranslationJob((job) =>
            job
              ? {
                  ...job,
                  completed: job.completed + 1,
                  phase: 'translating',
                }
              : job,
          ),
      );

      setFiles((currentFiles) => {
        const sourceIndex = currentFiles.findIndex(
          (currentFile) => currentFile.id === file.id,
        );
        const translatedFile: TranslationFile = {
          data: translatedData,
          fileName: getTranslatedFileName(file.fileName, targetLanguage),
          id: `translated-${targetLanguage}-${crypto.randomUUID()}`,
        };

        if (sourceIndex === -1) {
          return [...currentFiles, translatedFile];
        }

        return [
          ...currentFiles.slice(0, sourceIndex + 1),
          translatedFile,
          ...currentFiles.slice(sourceIndex + 1),
        ];
      });
    } catch (translationError) {
      setError(
        translationError instanceof Error
          ? translationError.message
          : 'Unable to translate this file.',
      );
    } finally {
      translator?.destroy?.();
      setTranslationJob(null);
    }
  };

  const toggleExpanded = (path: JsonPath) => {
    const key = pathToKey(path);
    setExpandedPaths((currentPaths) => {
      const next = new Set(currentPaths);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const updateValue = (fileId: string, path: JsonPath, value: JsonValue) => {
    updateFileData(fileId, (data) => setValueAtPath(data, path, value));
  };

  const updateKind = (fileId: string, path: JsonPath, kind: ValueKind) => {
    updateFileData(fileId, (data) => {
      const value = getValueAtPath(data, path);
      return setValueAtPath(data, path, coerceValue(value, kind));
    });
  };

  const removeValue = (fileId: string, path: JsonPath) => {
    updateFileData(fileId, (data) => removeValueAtPath(data, path));
  };

  const addObjectChild = (fileId: string, path: JsonPath) => {
    const key = draftKey(fileId, path);
    const draft = addDrafts[key] ?? { key: '', kind: 'string' };
    const childKey = draft.key.trim();

    if (!childKey) {
      return;
    }

    updateFileData(fileId, (data) => {
      const currentValue = getValueAtPath(data, path);
      const nextObject = isJsonObject(currentValue) ? { ...currentValue } : {};
      if (childKey in nextObject) {
        return data;
      }
      nextObject[childKey] = createDefaultValue(draft.kind);
      return setValueAtPath(data, path, nextObject);
    });

    setAddDrafts((drafts) => ({
      ...drafts,
      [key]: { ...draft, key: '' },
    }));
    setExpandedPaths((currentPaths) => new Set(currentPaths).add(pathToKey(path)));
  };

  const addArrayItem = (fileId: string, path: JsonPath) => {
    const key = draftKey(fileId, path);
    const draft = addDrafts[key] ?? { key: '', kind: 'string' };
    updateFileData(fileId, (data) =>
      insertArrayItem(data, path, createDefaultValue(draft.kind)),
    );
    setExpandedPaths((currentPaths) => new Set(currentPaths).add(pathToKey(path)));
  };

  const renameKey = (path: JsonPath) => {
    const key = pathToKey(path);
    const nextKey = (renameDrafts[key] ?? '').trim();

    if (!nextKey) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) => ({
        ...file,
        data: renameKeyAtPath(file.data, path, nextKey),
      })),
    );
    setRenameDrafts((drafts) => {
      const next = { ...drafts };
      delete next[key];
      return next;
    });
  };

  const renderPrimitiveEditor = (
    file: TranslationFile,
    path: JsonPath,
    value: JsonPrimitive,
  ) => {
    const kind = getValueKind(value);

    return (
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <KindSelect
            label={`Type for ${file.fileName} ${formatPath(path)}`}
            value={kind}
            onChange={(nextKind) => updateKind(file.id, path, nextKind)}
          />
          {path.length > 0 && (
            <Button
              aria-label='Delete value'
              size='icon-sm'
              variant='ghost'
              onClick={() => removeValue(file.id, path)}
            >
              <Trash2 />
            </Button>
          )}
          {renderArrayItemActions(file, path)}
        </div>

        {kind === 'string' && (
          <Input
            value={value as string}
            onChange={(event) => updateValue(file.id, path, event.target.value)}
            placeholder='Empty string'
          />
        )}

        {kind === 'number' && (
          <Input
            type='number'
            value={String(value)}
            onChange={(event) =>
              updateValue(file.id, path, Number(event.target.value || 0))
            }
          />
        )}

        {kind === 'boolean' && (
          <select
            aria-label={`Boolean value for ${file.fileName} ${formatPath(path)}`}
            value={String(value)}
            onChange={(event) =>
              updateValue(file.id, path, event.target.value === 'true')
            }
            className='h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
          >
            <option value='true'>true</option>
            <option value='false'>false</option>
          </select>
        )}

        {kind === 'null' && (
          <div className='flex h-9 items-center rounded-3xl bg-muted px-3 text-sm text-muted-foreground'>
            null
          </div>
        )}
      </div>
    );
  };

  const renderArrayItemActions = (file: TranslationFile, path: JsonPath) => {
    const segment = path[path.length - 1];

    if (typeof segment !== 'number') {
      return null;
    }

    const parentPath = path.slice(0, -1);
    const parent = getValueAtPath(file.data, parentPath);
    const itemCount = Array.isArray(parent) ? parent.length : 0;

    return (
      <div className='ml-auto flex items-center gap-1'>
        <Button
          aria-label='Move item up'
          disabled={segment === 0}
          size='icon-sm'
          variant='ghost'
          onClick={() =>
            updateFileData(file.id, (data) =>
              moveArrayItem(data, parentPath, segment, -1),
            )
          }
        >
          <ArrowUp />
        </Button>
        <Button
          aria-label='Move item down'
          disabled={segment >= itemCount - 1}
          size='icon-sm'
          variant='ghost'
          onClick={() =>
            updateFileData(file.id, (data) =>
              moveArrayItem(data, parentPath, segment, 1),
            )
          }
        >
          <ArrowDown />
        </Button>
        <Button
          aria-label='Duplicate item'
          size='icon-sm'
          variant='ghost'
          onClick={() =>
            updateFileData(file.id, (data) =>
              duplicateValue(data, parentPath, segment),
            )
          }
        >
          <Copy />
        </Button>
      </div>
    );
  };

  const renderCollectionEditor = (
    file: TranslationFile,
    path: JsonPath,
    value: JsonArray | JsonObject,
  ) => {
    const key = draftKey(file.id, path);
    const draft = addDrafts[key] ?? { key: '', kind: 'string' };
    const kind = getValueKind(value);
    const itemCount = Array.isArray(value)
      ? value.length
      : Object.keys(value).length;

    return (
      <div className='flex min-w-0 flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <KindSelect
            label={`Type for ${file.fileName} ${formatPath(path)}`}
            value={kind}
            onChange={(nextKind) => updateKind(file.id, path, nextKind)}
          />
          <StatusBadge tone='default'>
            {itemCount} {Array.isArray(value) ? 'items' : 'keys'}
          </StatusBadge>
          {path.length > 0 && (
            <Button
              aria-label='Delete collection'
              size='icon-sm'
              variant='ghost'
              onClick={() => removeValue(file.id, path)}
            >
              <Trash2 />
            </Button>
          )}
          {renderArrayItemActions(file, path)}
        </div>

        {isJsonObject(value) && (
          <div className='grid grid-cols-[minmax(0,1fr)_104px_auto] gap-2'>
            <Input
              aria-label='New key name'
              value={draft.key}
              onChange={(event) =>
                setAddDrafts((drafts) => ({
                  ...drafts,
                  [key]: { ...draft, key: event.target.value },
                }))
              }
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  addObjectChild(file.id, path);
                }
              }}
              placeholder='New key'
            />
            <KindSelect
              label='New key type'
              value={draft.kind}
              onChange={(nextKind) =>
                setAddDrafts((drafts) => ({
                  ...drafts,
                  [key]: { ...draft, kind: nextKind },
                }))
              }
            />
            <Button
              aria-label='Add key'
              size='icon'
              variant='outline'
              onClick={() => addObjectChild(file.id, path)}
            >
              <Plus />
            </Button>
          </div>
        )}

        {Array.isArray(value) && (
          <div className='grid grid-cols-[104px_auto_1fr] items-center gap-2'>
            <KindSelect
              label='New array item type'
              value={draft.kind}
              onChange={(nextKind) =>
                setAddDrafts((drafts) => ({
                  ...drafts,
                  [key]: { ...draft, kind: nextKind },
                }))
              }
            />
            <Button
              className='w-fit'
              size='sm'
              variant='outline'
              onClick={() => addArrayItem(file.id, path)}
            >
              <Plus />
              Add item
            </Button>
            <span className='truncate text-xs text-muted-foreground'>
              Appends a {draft.kind} value
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderValueCell = (file: TranslationFile, path: JsonPath) => {
    const value = getValueAtPath(file.data, path);

    if (value === MISSING) {
      const suggestedKind = getSuggestedKind(files, path);

      return (
        <div className='flex min-h-20 items-center justify-between gap-2 rounded-3xl border border-dashed border-destructive/30 bg-destructive/5 p-3'>
          <span className='text-sm text-muted-foreground'>Missing here</span>
          <Button
            size='sm'
            variant='outline'
            onClick={() =>
              updateValue(file.id, path, createDefaultValue(suggestedKind))
            }
          >
            <Plus />
            Create {suggestedKind}
          </Button>
        </div>
      );
    }

    return (
      <div className='rounded-3xl bg-card p-3 shadow-sm ring-1 ring-border/70'>
        {Array.isArray(value) || isJsonObject(value)
          ? renderCollectionEditor(file, path, value)
          : renderPrimitiveEditor(file, path, value)}
      </div>
    );
  };

  const renderTreeRow = (path: JsonPath, depth = 0): React.ReactNode => {
    const childSegments = collectChildSegments(files, path);
    const key = pathToKey(path);
    const isExpanded = expandedPaths.has(key);
    const status = getPathStatus(files, path);
    const segment = path[path.length - 1];
    const canRename = typeof segment === 'string';
    const renameValue = renameDrafts[key] ?? segment ?? '';

    return (
      <div key={key}>
        <div
          className='grid min-w-max items-stretch border-b border-border/60 bg-background/80'
          style={{ gridTemplateColumns }}
        >
          <div className='sticky left-0 z-10 flex min-h-24 items-center gap-2 border-r border-border/60 bg-background/95 px-3 py-3'>
            <div style={{ width: depth * 18 }} />
            <Button
              aria-label={isExpanded ? 'Collapse path' : 'Expand path'}
              disabled={childSegments.length === 0}
              size='icon-sm'
              variant='ghost'
              onClick={() => toggleExpanded(path)}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 flex items-center gap-2'>
                <span className='truncate text-sm font-semibold'>
                  {formatSegment(segment)}
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <p className='truncate text-xs text-muted-foreground'>
                {formatPath(path)}
              </p>
              {canRename && (
                <div className='mt-2 flex max-w-72 items-center gap-2'>
                  <Input
                    aria-label='Rename key across files'
                    value={String(renameValue)}
                    onChange={(event) =>
                      setRenameDrafts((drafts) => ({
                        ...drafts,
                        [key]: event.target.value,
                      }))
                    }
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Enter') {
                        renameKey(path);
                      }
                    }}
                  />
                  <Button size='sm' variant='outline' onClick={() => renameKey(path)}>
                    Rename
                  </Button>
                </div>
              )}
            </div>
          </div>

          {files.map((file) => (
            <div key={file.id} className='min-w-0 border-r border-border/40 p-3'>
              {renderValueCell(file, path)}
            </div>
          ))}
        </div>

        {isExpanded &&
          childSegments.map((childSegment) =>
            renderTreeRow([...path, childSegment], depth + 1),
          )}
      </div>
    );
  };

  return (
    <div className='flex min-h-svh flex-col bg-muted/40'>
      <header className='sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-xl font-semibold tracking-normal'>Trans Diff</h1>
            <p className='text-sm text-muted-foreground'>
              Compare and edit JSON translation files as a typed tree.
            </p>
          </div>

          <div className='flex flex-wrap items-end gap-2'>
            <div className='grid min-w-44 gap-1'>
              <span className='px-1 text-xs font-medium text-muted-foreground'>
                Source file
              </span>
              <select
                aria-label='Source file for translation'
                className='h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-medium outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50'
                disabled={files.length === 0 || translationJob !== null}
                value={selectedSourceFile?.id ?? ''}
                onChange={(event) => setSelectedSourceFileId(event.target.value)}
              >
                {files.length === 0 ? (
                  <option value=''>No files loaded</option>
                ) : (
                  files.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.fileName}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className='grid gap-1'>
              <span className='px-1 text-xs font-medium text-muted-foreground'>
                From
              </span>
              <LanguageSelect
                label='Source language'
                value={sourceLanguage}
                onChange={setSourceLanguage}
              />
            </div>
            <div className='grid gap-1'>
              <span className='px-1 text-xs font-medium text-muted-foreground'>
                To
              </span>
              <LanguageSelect
                label='Target language'
                value={targetLanguage}
                onChange={setTargetLanguage}
              />
            </div>
            <Button
              disabled={
                !isTranslatorSupported ||
                !selectedSourceFile ||
                translationJob !== null
              }
              onClick={handleTranslateSelectedFile}
              variant='outline'
            >
              {translationJob ? (
                <LoaderCircle className='animate-spin' />
              ) : (
                <Languages />
              )}
              Add translation
            </Button>
            <input
              id='file-upload'
              className='sr-only'
              type='file'
              accept='.json,application/json'
              multiple
              onChange={handleFileUpload}
            />
            <label
              htmlFor='file-upload'
              className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}
            >
              <Upload />
              Add JSON
            </label>
          </div>
        </div>
        <div className='mt-2 min-h-5 text-xs text-muted-foreground'>
          {translationJob ? (
            <span>
              {translationJob.phase === 'checking' && 'Checking translation'}
              {translationJob.phase === 'downloading' &&
                `Downloading language pack${
                  translationJob.downloadProgress === null
                    ? ''
                    : ` ${translationJob.downloadProgress}%`
                }`}
              {translationJob.phase === 'translating' &&
                `Translating ${translationJob.completed}/${translationJob.total}`}
            </span>
          ) : files.length === 0 ? (
            <span>Load a JSON file to create a translated column.</span>
          ) : isTranslatorSupported ? (
            <span>
              Add translation creates a new column beside the selected source file.
            </span>
          ) : (
            <span>
              Add translation requires Chrome desktop Translator API support. It is
              unavailable in this browser.
            </span>
          )}
        </div>
      </header>

      {error && (
        <Alert variant='destructive' className='mx-4 mt-4'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <main className='flex-1 overflow-hidden p-4'>
        {files.length === 0 ? (
          <Card
            className={cn(
              'mx-auto flex min-h-[520px] max-w-3xl items-center justify-center border-dashed bg-background transition-[border-color,background-color,box-shadow]',
              isDraggingJson &&
                'border-primary bg-muted/60 shadow-sm ring-3 ring-ring/20',
            )}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CardContent className='flex flex-col items-center gap-4 p-10 text-center'>
              <div className='flex size-14 items-center justify-center rounded-full bg-muted'>
                <Upload className='size-6 text-muted-foreground' />
              </div>
              <div>
                <h2 className='text-lg font-semibold'>Add JSON files</h2>
                <p className='mt-1 max-w-md text-sm text-muted-foreground'>
                  Drag JSON files here, or select files to compare keys, edit
                  typed values, and manage nested objects or arrays from one tree.
                </p>
              </div>
              <label
                htmlFor='file-upload'
                className={cn(buttonVariants(), 'cursor-pointer')}
              >
                <Upload />
                Select files
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card className='h-full overflow-hidden bg-background shadow-sm'>
            <CardContent className='h-full p-0'>
              <div className='h-full overflow-auto'>
                <div
                  className='sticky top-0 z-20 grid min-w-max border-b border-border/70 bg-background'
                  style={{ gridTemplateColumns }}
                >
                  <div className='sticky left-0 z-30 border-r border-border/60 bg-background p-3'>
                    <p className='text-xs font-medium uppercase text-muted-foreground'>
                      Tree
                    </p>
                    <p className='mt-1 text-sm font-semibold'>
                      {files.length} files loaded
                    </p>
                  </div>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className='flex min-w-0 items-center justify-between gap-3 border-r border-border/40 p-3'
                    >
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>
                          {file.fileName}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {countLeaves(file.data)} leaf values
                        </p>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Button
                          aria-label={`Save ${file.fileName}`}
                          size='icon-sm'
                          variant='ghost'
                          onClick={() => handleSave(file)}
                        >
                          <Save />
                        </Button>
                        <Button
                          aria-label={`Remove ${file.fileName}`}
                          size='icon-sm'
                          variant='ghost'
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {renderTreeRow([])}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
