import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { Upload, X } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { Landing } from '@/components/landing';
import { PasteJsonDialog } from '@/components/paste-json-dialog';
import { TranslatePopover } from '@/components/translate-popover';
import { TreeTable } from '@/components/tree/tree-table';
import type { TreeActions } from '@/components/tree/types';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePasteJson } from '@/hooks/use-paste-json';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { debugPasteDialog } from '@/lib/debug';
import {
  coerceValue,
  collectVisiblePaths,
  countLeaves,
  countNotSyncedPaths,
  createDefaultValue,
  createSearchFilter,
  duplicateValue,
  getJsonValueDebugSummary,
  getValueAtPath,
  insertArrayItem,
  isJsonObject,
  isJsonValue,
  moveArrayItem,
  normalizeJsonFileName,
  pathToKey,
  removeValueAtPath,
  renameKeyAtPath,
  setValueAtPath,
  type JsonValue,
  type TranslationFile,
} from '@/lib/json-tree';
import { SAMPLE_FILES } from '@/lib/sample-files';

const FILE_INPUT_ID = 'file-upload';
const ROOT_KEY = pathToKey([]);

export default function Home() {
  const [files, setFiles] = useState<TranslationFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSourceFileId, setSelectedSourceFileId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set([ROOT_KEY]),
  );
  const dragDepthRef = useRef(0);
  const { theme, toggleTheme } = useTheme();

  const treePaths = useMemo(() => collectVisiblePaths(files), [files]);
  const searchFilter = useMemo(
    () => createSearchFilter(treePaths, searchQuery),
    [searchQuery, treePaths],
  );
  const notSyncedPathCount = useMemo(() => countNotSyncedPaths(files), [files]);
  const selectedSourceFile =
    files.find((file) => file.id === selectedSourceFileId) ?? files[0] ?? null;

  const addJsonFile = useCallback(
    (fileName: string, data: JsonValue, idSeed: string) => {
      const normalizedFileName = normalizeJsonFileName(fileName);
      const nextFile: TranslationFile = {
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
      setExpandedPaths((currentPaths) => new Set(currentPaths).add(ROOT_KEY));
      setError(null);
    },
    [],
  );

  const pasteJson = usePasteJson({
    fileCount: files.length,
    onAddFile: addJsonFile,
  });

  const translation = useTranslation({
    onError: setError,
    onTranslated: (sourceFile, translatedFile) => {
      setFiles((currentFiles) => {
        const sourceIndex = currentFiles.findIndex(
          (file) => file.id === sourceFile.id,
        );
        if (sourceIndex === -1) {
          return [...currentFiles, translatedFile];
        }
        return [
          ...currentFiles.slice(0, sourceIndex + 1),
          translatedFile,
          ...currentFiles.slice(sourceIndex + 1),
        ];
      });
    },
  });

  const updateFileData = (
    fileId: string,
    updater: (data: JsonValue) => JsonValue,
  ) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === fileId ? { ...file, data: updater(file.data) } : file,
      ),
    );
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
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
              uploadError instanceof Error ? uploadError.message : 'Unknown error'
            }`,
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const hasFilePayload = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files');

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(event)) {
      return;
    }
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    handleFilesSelected(Array.from(event.dataTransfer.files));
  };

  const loadSampleFiles = () => {
    SAMPLE_FILES.forEach((sample, index) => {
      addJsonFile(sample.fileName, sample.data, `sample-${index}`);
    });
  };

  const actions: TreeActions = {
    addArrayItem: (fileId, path, kind) => {
      updateFileData(fileId, (data) =>
        insertArrayItem(data, path, createDefaultValue(kind)),
      );
      setExpandedPaths((currentPaths) =>
        new Set(currentPaths).add(pathToKey(path)),
      );
    },
    addObjectKey: (fileId, path, key, kind) => {
      const file = files.find((currentFile) => currentFile.id === fileId);
      const currentValue = file ? getValueAtPath(file.data, path) : null;
      if (isJsonObject(currentValue) && key in currentValue) {
        return false;
      }

      updateFileData(fileId, (data) => {
        const value = getValueAtPath(data, path);
        const nextObject = isJsonObject(value) ? { ...value } : {};
        nextObject[key] = createDefaultValue(kind);
        return setValueAtPath(data, path, nextObject);
      });
      setExpandedPaths((currentPaths) =>
        new Set(currentPaths).add(pathToKey(path)),
      );
      return true;
    },
    collapseAll: () => setExpandedPaths(new Set([ROOT_KEY])),
    duplicateArrayItem: (fileId, path) => {
      const index = path[path.length - 1];
      if (typeof index !== 'number') {
        return;
      }
      updateFileData(fileId, (data) =>
        duplicateValue(data, path.slice(0, -1), index),
      );
    },
    expandAll: () =>
      setExpandedPaths(new Set(treePaths.map((path) => pathToKey(path)))),
    moveArrayItem: (fileId, path, direction) => {
      const index = path[path.length - 1];
      if (typeof index !== 'number') {
        return;
      }
      updateFileData(fileId, (data) =>
        moveArrayItem(data, path.slice(0, -1), index, direction),
      );
    },
    removeFile: (fileId) => {
      setFiles((currentFiles) =>
        currentFiles.filter((file) => file.id !== fileId),
      );
      setSelectedSourceFileId((currentId) =>
        currentId === fileId ? '' : currentId,
      );
    },
    removeValue: (fileId, path) => {
      updateFileData(fileId, (data) => removeValueAtPath(data, path));
    },
    removeValueEverywhere: (path) => {
      setFiles((currentFiles) =>
        currentFiles.map((file) => ({
          ...file,
          data: removeValueAtPath(file.data, path),
        })),
      );
    },
    renameKey: (path, nextKey) => {
      setFiles((currentFiles) =>
        currentFiles.map((file) => ({
          ...file,
          data: renameKeyAtPath(file.data, path, nextKey),
        })),
      );
    },
    saveFile: (file) => {
      const blob = new Blob([JSON.stringify(file.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    setKind: (fileId, path, kind) => {
      updateFileData(fileId, (data) =>
        setValueAtPath(data, path, coerceValue(getValueAtPath(data, path), kind)),
      );
    },
    setValue: (fileId, path, value) => {
      updateFileData(fileId, (data) => setValueAtPath(data, path, value));
    },
    toggleExpanded: (path) => {
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
    },
  };

  return (
    <div
      className='relative flex h-svh flex-col bg-muted/30'
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept='.json,application/json'
        className='sr-only'
        id={FILE_INPUT_ID}
        multiple
        type='file'
        onChange={handleFileUpload}
      />

      <AppHeader
        fileCount={files.length}
        fileInputId={FILE_INPUT_ID}
        notSyncedCount={notSyncedPathCount}
        theme={theme}
        translateSlot={
          files.length > 0 ? (
            <TranslatePopover
              files={files}
              isSupported={translation.isSupported}
              job={translation.job}
              sourceFileId={selectedSourceFile?.id ?? ''}
              sourceLanguage={translation.sourceLanguage}
              targetLanguage={translation.targetLanguage}
              onSourceFileChange={setSelectedSourceFileId}
              onSourceLanguageChange={translation.setSourceLanguage}
              onTargetLanguageChange={translation.setTargetLanguage}
              onTranslate={() => {
                if (selectedSourceFile) {
                  void translation.translate(selectedSourceFile);
                }
              }}
            />
          ) : null
        }
        onPaste={pasteJson.open}
        onToggleTheme={toggleTheme}
      />

      {error && (
        <Alert
          className='mx-3 mt-3 shrink-0 animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-out'
          variant='destructive'
        >
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button
              aria-label='Dismiss error'
              size='icon-xs'
              variant='ghost'
              onClick={() => setError(null)}
            >
              <X />
            </Button>
          </AlertAction>
        </Alert>
      )}

      <PasteJsonDialog {...pasteJson.dialogProps} />

      <main className='flex min-h-0 flex-1 flex-col overflow-auto'>
        {files.length === 0 ? (
          <Landing
            fileInputId={FILE_INPUT_ID}
            isDragging={isDragging}
            onLoadSample={loadSampleFiles}
            onPaste={pasteJson.open}
          />
        ) : (
          <div className='min-h-0 flex-1 p-3'>
            <div className='h-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 animate-in fade-in-0 duration-200 ease-out'>
              <TreeTable
                actions={actions}
                expandedPaths={expandedPaths}
                files={files}
                searchFilter={searchFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </div>
        )}
      </main>

      {isDragging && files.length > 0 && (
        <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in-0 duration-150 ease-out'>
          <div className='flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-card px-10 py-8 text-center shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 ease-out'>
            <Upload className='size-6 text-muted-foreground' />
            <p className='font-medium'>Drop JSON files to add them</p>
          </div>
        </div>
      )}
    </div>
  );
}
