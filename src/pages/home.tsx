import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Languages,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { GithubMarkIcon } from '@/components/github-mark-icon';
import {
  KindSelect,
  LanguageSelect,
  SelectIndicator,
  StatusBadge,
} from '@/components/json-tree-controls';
import { PasteJsonDialog } from '@/components/paste-json-dialog';
import { selectControlClassName } from '@/components/select-control';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  countTranslatableStrings,
  getTranslatedFileName,
  getTranslatorFactory,
  translateJsonValue,
  type BuiltInTranslator,
  type TranslationJob,
} from '@/lib/browser-translator';
import { debugPasteDialog, isPasteDialogDebugEnabled } from '@/lib/debug';
import {
  collectChildSegments,
  collectVisiblePaths,
  coerceValue,
  countLeaves,
  countNotSyncedPaths,
  createDefaultValue,
  createSearchFilter,
  draftKey,
  duplicateValue,
  formatPath,
  formatSegment,
  getJsonValueDebugSummary,
  getPathStatus,
  getSuggestedKind,
  getValueAtPath,
  getValueKind,
  insertArrayItem,
  isJsonObject,
  isJsonValue,
  MISSING,
  moveArrayItem,
  normalizeJsonFileName,
  pathToKey,
  removeValueAtPath,
  renameKeyAtPath,
  setValueAtPath,
  type JsonArray,
  type JsonObject,
  type JsonPath,
  type JsonPrimitive,
  type JsonValue,
  type TranslationFile,
  type ValueKind,
} from '@/lib/json-tree';
import { cn } from '@/lib/utils';

type AddDraft = {
  key: string;
  kind: ValueKind;
};

type PendingPastedJson = {
  data: JsonValue;
  fileName: string;
  idSeed: string;
};

const PASTE_DIALOG_COMMIT_DELAY_MS = 150;
const GITHUB_REPOSITORY_URL = 'https://github.com/taufiq-dev/trans-diff';

export default function Home() {
  const [files, setFiles] = useState<TranslationFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [selectedSourceFileId, setSelectedSourceFileId] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pendingPastedJson, setPendingPastedJson] =
    useState<PendingPastedJson | null>(null);
  const [pasteFileName, setPasteFileName] = useState('pasted.json');
  const [pasteJsonContent, setPasteJsonContent] = useState('');
  const [pasteJsonError, setPasteJsonError] = useState<string | null>(null);
  const [translationJob, setTranslationJob] = useState<TranslationJob | null>(
    null,
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['[]']),
  );
  const [addDrafts, setAddDrafts] = useState<Record<string, AddDraft>>({});
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [, startPasteJsonTransition] = useTransition();
  const pasteDialogCommitCountRef = useRef(0);
  const previousPasteDialogOpenRef = useRef(isPasteDialogOpen);
  const isTranslatorSupported = getTranslatorFactory() !== null;

  const treePaths = useMemo(() => collectVisiblePaths(files), [files]);
  const searchFilter = useMemo(
    () => createSearchFilter(treePaths, searchQuery),
    [searchQuery, treePaths],
  );
  const trimmedSearchQuery = searchQuery.trim();
  const notSyncedPathCount = useMemo(() => countNotSyncedPaths(files), [files]);
  const selectedSourceFile =
    files.find((file) => file.id === selectedSourceFileId) ?? files[0] ?? null;

  useEffect(() => {
    pasteDialogCommitCountRef.current += 1;

    if (
      isPasteDialogDebugEnabled() &&
      (isPasteDialogOpen ||
        pendingPastedJson !== null ||
        pasteJsonContent ||
        pasteJsonError)
    ) {
      debugPasteDialog('commit', {
        chars: pasteJsonContent.length,
        commit: pasteDialogCommitCountRef.current,
        files: files.length,
        hasError: Boolean(pasteJsonError),
        hasPending: pendingPastedJson !== null,
        open: isPasteDialogOpen,
      });
    }
  });

  useEffect(() => {
    debugPasteDialog('open-state-commit', {
      commit: pasteDialogCommitCountRef.current,
      nextOpen: isPasteDialogOpen,
      previousOpen: previousPasteDialogOpenRef.current,
    });
    previousPasteDialogOpenRef.current = isPasteDialogOpen;
  }, [isPasteDialogOpen]);

  useEffect(() => {
    debugPasteDialog('file-count-commit', {
      commit: pasteDialogCommitCountRef.current,
      files: files.length,
      open: isPasteDialogOpen,
    });
  }, [files.length, isPasteDialogOpen]);

  const updateFileData = (fileId: string, updater: (data: JsonValue) => JsonValue) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === fileId ? { ...file, data: updater(file.data) } : file,
      ),
    );
  };

  const addJsonFile = useCallback(
    (fileName: string, data: JsonValue, idSeed: string) => {
      const normalizedFileName = normalizeJsonFileName(fileName);
      const nextFile = {
        data,
        fileName: normalizedFileName,
        id: `${normalizedFileName}-${idSeed}-${crypto.randomUUID()}`,
      };

      debugPasteDialog('add-json-file', {
        fileName: normalizedFileName,
        idSeed,
        leafCount: countLeaves(data),
        root: getJsonValueDebugSummary(data),
      });
      setFiles((currentFiles) => [...currentFiles, nextFile]);
      setSelectedSourceFileId((currentId) => currentId || nextFile.id);
      setExpandedPaths((currentPaths) => new Set(currentPaths).add('[]'));
      setError(null);
    },
    [],
  );

  useEffect(() => {
    if (isPasteDialogOpen || pendingPastedJson === null) {
      return undefined;
    }

    debugPasteDialog('pending-commit-scheduled', {
      delayMs: PASTE_DIALOG_COMMIT_DELAY_MS,
      fileName: pendingPastedJson.fileName,
    });

    const timeoutId = window.setTimeout(() => {
      debugPasteDialog('pending-commit-timeout-fired', {
        fileName: pendingPastedJson.fileName,
      });
      startPasteJsonTransition(() => {
        debugPasteDialog('pending-commit-transition-updates', {
          fileName: pendingPastedJson.fileName,
        });
        addJsonFile(
          pendingPastedJson.fileName,
          pendingPastedJson.data,
          pendingPastedJson.idSeed,
        );
        setPasteFileName('pasted.json');
        setPasteJsonContent('');
        setPendingPastedJson(null);
      });
    }, PASTE_DIALOG_COMMIT_DELAY_MS);

    return () => {
      debugPasteDialog('pending-commit-cleanup', {
        fileName: pendingPastedJson.fileName,
      });
      window.clearTimeout(timeoutId);
    };
  }, [
    addJsonFile,
    isPasteDialogOpen,
    pendingPastedJson,
    startPasteJsonTransition,
  ]);

  const openPasteDialog = () => {
    debugPasteDialog('open-request', {
      currentOpen: isPasteDialogOpen,
    });
    setIsPasteDialogOpen(true);
  };

  const handlePasteDialogOpenChange = (nextOpen: boolean) => {
    debugPasteDialog('dialog-open-change', {
      currentOpen: isPasteDialogOpen,
      nextOpen,
    });
    setIsPasteDialogOpen(nextOpen);
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

          addJsonFile(file.name, parsed, String(file.lastModified));
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

  const handlePasteJsonSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    debugPasteDialog('submit-start', {
      chars: pasteJsonContent.length,
      open: isPasteDialogOpen,
    });

    if (!pasteJsonContent.trim()) {
      debugPasteDialog('submit-empty');
      setPasteJsonError('Paste JSON content before adding a file.');
      return;
    }

    try {
      const parsed = JSON.parse(pasteJsonContent);

      if (!isJsonValue(parsed)) {
        throw new Error('The pasted content contains values that are not valid JSON.');
      }

      const submittedFileName = pasteFileName;
      const submittedAt = String(Date.now());

      debugPasteDialog('submit-parse-success', {
        chars: pasteJsonContent.length,
        fileName: submittedFileName,
        leafCount: countLeaves(parsed),
        root: getJsonValueDebugSummary(parsed),
      });
      setPasteJsonError(null);
      setPendingPastedJson({
        data: parsed,
        fileName: submittedFileName,
        idSeed: submittedAt,
      });
      debugPasteDialog('submit-close-request', {
        fileName: submittedFileName,
        open: isPasteDialogOpen,
      });
      setIsPasteDialogOpen(false);
    } catch (pasteError) {
      debugPasteDialog('submit-error', {
        message:
          pasteError instanceof Error
            ? pasteError.message
            : 'The pasted content is not valid JSON.',
      });
      setPasteJsonError(
        pasteError instanceof Error
          ? pasteError.message
          : 'The pasted content is not valid JSON.',
      );
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
          <div className='relative w-fit'>
            <select
              aria-label={`Boolean value for ${file.fileName} ${formatPath(path)}`}
              value={String(value)}
              onChange={(event) =>
                updateValue(file.id, path, event.target.value === 'true')
              }
              className={cn(selectControlClassName, 'h-9 text-sm')}
            >
              <option value='true'>true</option>
              <option value='false'>false</option>
            </select>
            <SelectIndicator />
          </div>
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
          <div className='grid grid-cols-[minmax(0,1fr)_112px_auto] gap-2'>
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
          <div className='grid grid-cols-[112px_auto_1fr] items-center gap-2'>
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
    const key = pathToKey(path);
    const activeSearchFilter = searchFilter;
    const isSearchActive = activeSearchFilter !== null;

    if (isSearchActive && !activeSearchFilter.visiblePathKeys.has(key)) {
      return null;
    }

    const childSegments = collectChildSegments(files, path).filter((childSegment) => {
      if (!isSearchActive) {
        return true;
      }

      return activeSearchFilter.visiblePathKeys.has(
        pathToKey([...path, childSegment]),
      );
    });
    const isExpanded = isSearchActive
      ? childSegments.length > 0
      : expandedPaths.has(key);
    const status = getPathStatus(files, path);
    const segment = path[path.length - 1];
    const canRename = typeof segment === 'string';
    const renameValue = renameDrafts[key] ?? segment ?? '';

    return (
      <div key={key}>
        <div className='flex min-w-max items-stretch border-b border-border/60 bg-background/80'>
          <div className='sticky left-0 z-10 flex min-h-24 w-80 shrink-0 items-center gap-2 border-r border-border/60 bg-background/95 px-3 py-3'>
            {Array.from({ length: depth }, (_, index) => (
              <span
                aria-hidden='true'
                className='block w-4.5 shrink-0'
                key={index}
              />
            ))}
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
            <div
              key={file.id}
              className='min-w-85 flex-1 border-r border-border/40 p-3'
            >
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
      <header className='sticky top-0 z-40 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-xl font-semibold tracking-normal'>Trans Diff</h1>
              {files.length > 0 && (
                <StatusBadge
                  tone={notSyncedPathCount > 0 ? 'warning' : 'success'}
                >
                  <span className='tabular-nums'>{notSyncedPathCount}</span>
                  <span className='ml-1'>not synced</span>
                </StatusBadge>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>
              Compare and edit JSON translation files as a typed tree.
            </p>
          </div>

          <div className='flex flex-wrap items-end gap-2'>
            <div className='grid min-w-44 gap-1'>
              <span className='px-1 text-xs font-medium text-muted-foreground'>
                Source file
              </span>
              <div className='relative'>
                <select
                  aria-label='Source file for translation'
                  className={cn(selectControlClassName, 'h-9 w-full text-sm font-medium')}
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
                <SelectIndicator />
              </div>
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
            <Button variant='outline' onClick={openPasteDialog}>
              <ClipboardPaste />
              Paste JSON
            </Button>
            <a
              aria-label='View Trans Diff on GitHub'
              className={buttonVariants({ variant: 'outline', size: 'icon' })}
              href={GITHUB_REPOSITORY_URL}
              rel='noreferrer'
              target='_blank'
            >
              <GithubMarkIcon />
            </a>
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

      <PasteJsonDialog
        fileName={pasteFileName}
        jsonContent={pasteJsonContent}
        jsonError={pasteJsonError}
        open={isPasteDialogOpen}
        onFileNameChange={setPasteFileName}
        onJsonContentChange={setPasteJsonContent}
        onJsonErrorChange={setPasteJsonError}
        onOpenChange={handlePasteDialogOpenChange}
        onSubmit={handlePasteJsonSubmit}
      />

      <main className='relative z-0 flex-1 overflow-hidden p-4'>
        {files.length === 0 ? (
          <Card
            className={cn(
              'mx-auto flex min-h-130 max-w-3xl items-center justify-center border-2 border-dashed border-muted-foreground/35 bg-background transition-[border-color,background-color,box-shadow]',
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
                  Drag JSON files here, select files, or paste raw JSON to compare
                  keys, edit typed values, and manage nested objects or arrays from
                  one tree.
                </p>
              </div>
              <div className='flex flex-wrap justify-center gap-2'>
                <label
                  htmlFor='file-upload'
                  className={cn(buttonVariants(), 'cursor-pointer')}
                >
                  <Upload />
                  Select files
                </label>
                <Button
                  variant='outline'
                  onClick={openPasteDialog}
                >
                  <ClipboardPaste />
                  Paste JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className='h-full overflow-hidden bg-background shadow-sm'>
            <CardContent className='h-full p-0'>
              <div className='h-full overflow-auto'>
                <div className='sticky top-0 z-20 flex min-w-max border-b border-border/70 bg-background'>
                  <div className='sticky left-0 z-30 w-80 shrink-0 border-r border-border/60 bg-background p-3'>
                    <p className='text-xs font-medium uppercase text-muted-foreground'>
                      Tree
                    </p>
                    <div className='mt-1 flex items-center justify-between gap-2'>
                      <p className='text-sm font-semibold'>
                        {files.length} files loaded
                      </p>
                      {searchFilter && (
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          <span className='tabular-nums'>
                            {searchFilter.matchCount}
                          </span>{' '}
                          {searchFilter.matchCount === 1 ? 'match' : 'matches'}
                        </span>
                      )}
                    </div>
                    <div className='relative mt-3'>
                      <Search
                        aria-hidden='true'
                        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                      />
                      <Input
                        aria-label='Search keys or paths'
                        className='h-9 rounded-3xl bg-input/50 pl-9 pr-9'
                        placeholder='Search keys or paths'
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          aria-label='Clear key search'
                          className='absolute right-1 top-1/2 size-7 -translate-y-1/2'
                          size='icon-sm'
                          variant='ghost'
                          onClick={() => setSearchQuery('')}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </div>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className='flex min-w-85 flex-1 items-center justify-between gap-3 border-r border-border/40 p-3'
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

                {searchFilter?.matchCount === 0 ? (
                  <div className='p-6 text-sm text-muted-foreground'>
                    No keys or paths match "{trimmedSearchQuery}".
                  </div>
                ) : (
                  renderTreeRow([])
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
