import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { debugPasteDialog, isPasteDialogDebugEnabled } from '@/lib/debug';
import {
  countLeaves,
  getJsonValueDebugSummary,
  isJsonValue,
  type JsonValue,
} from '@/lib/json-tree';

type PendingPastedJson = {
  data: JsonValue;
  fileName: string;
  idSeed: string;
};

type UsePasteJsonOptions = {
  fileCount: number;
  onAddFile: (fileName: string, data: JsonValue, idSeed: string) => void;
};

const PASTE_DIALOG_COMMIT_DELAY_MS = 150;
const DEFAULT_FILE_NAME = 'pasted.json';

// The pasted JSON is committed to state only after the dialog has closed and
// its exit animation has had time to finish, so the (potentially large) tree
// render never competes with the dialog closing.
export function usePasteJson({ fileCount, onAddFile }: UsePasteJsonOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<PendingPastedJson | null>(null);
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const commitCountRef = useRef(0);
  const previousOpenRef = useRef(isOpen);

  useEffect(() => {
    commitCountRef.current += 1;

    if (
      isPasteDialogDebugEnabled() &&
      (isOpen || pending !== null || content || error)
    ) {
      debugPasteDialog('commit', {
        chars: content.length,
        commit: commitCountRef.current,
        files: fileCount,
        hasError: Boolean(error),
        hasPending: pending !== null,
        open: isOpen,
      });
    }
  });

  useEffect(() => {
    debugPasteDialog('open-state-commit', {
      commit: commitCountRef.current,
      nextOpen: isOpen,
      previousOpen: previousOpenRef.current,
    });
    previousOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    debugPasteDialog('file-count-commit', {
      commit: commitCountRef.current,
      files: fileCount,
      open: isOpen,
    });
  }, [fileCount, isOpen]);

  useEffect(() => {
    if (isOpen || pending === null) {
      return undefined;
    }

    debugPasteDialog('pending-commit-scheduled', {
      delayMs: PASTE_DIALOG_COMMIT_DELAY_MS,
      fileName: pending.fileName,
    });

    const timeoutId = window.setTimeout(() => {
      debugPasteDialog('pending-commit-timeout-fired', {
        fileName: pending.fileName,
      });
      startTransition(() => {
        debugPasteDialog('pending-commit-transition-updates', {
          fileName: pending.fileName,
        });
        onAddFile(pending.fileName, pending.data, pending.idSeed);
        setFileName(DEFAULT_FILE_NAME);
        setContent('');
        setPending(null);
      });
    }, PASTE_DIALOG_COMMIT_DELAY_MS);

    return () => {
      debugPasteDialog('pending-commit-cleanup', { fileName: pending.fileName });
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, onAddFile, pending, startTransition]);

  const open = () => {
    debugPasteDialog('open-request', { currentOpen: isOpen });
    setIsOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    debugPasteDialog('dialog-open-change', { currentOpen: isOpen, nextOpen });
    setIsOpen(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    debugPasteDialog('submit-start', { chars: content.length, open: isOpen });

    if (!content.trim()) {
      debugPasteDialog('submit-empty');
      setError('Paste JSON content before adding a file.');
      return;
    }

    try {
      const parsed = JSON.parse(content);

      if (!isJsonValue(parsed)) {
        throw new Error('The pasted content contains values that are not valid JSON.');
      }

      debugPasteDialog('submit-parse-success', {
        chars: content.length,
        fileName,
        leafCount: countLeaves(parsed),
        root: getJsonValueDebugSummary(parsed),
      });
      setError(null);
      setPending({ data: parsed, fileName, idSeed: String(Date.now()) });
      debugPasteDialog('submit-close-request', { fileName, open: isOpen });
      setIsOpen(false);
    } catch (pasteError) {
      const message =
        pasteError instanceof Error
          ? pasteError.message
          : 'The pasted content is not valid JSON.';
      debugPasteDialog('submit-error', { message });
      setError(message);
    }
  };

  return {
    dialogProps: {
      fileName,
      jsonContent: content,
      jsonError: error,
      onFileNameChange: setFileName,
      onJsonContentChange: setContent,
      onJsonErrorChange: setError,
      onOpenChange: handleOpenChange,
      onSubmit: handleSubmit,
      open: isOpen,
    },
    open,
  };
}
