type DebugDetails = Record<string, boolean | null | number | string | undefined>;

const PASTE_DIALOG_DEBUG_QUERY_PARAM = 'debugPasteDialog';
const PASTE_DIALOG_DEBUG_STORAGE_KEY = 'trans-diff:debug:paste-dialog';
const DISABLED_DEBUG_VALUES = new Set(['0', 'false', 'no', 'off']);

const isDebugValueEnabled = (value: string | null): boolean =>
  value !== null && !DISABLED_DEBUG_VALUES.has(value.toLowerCase());

const getDebugTimestamp = (): number =>
  typeof performance === 'undefined' ? Date.now() : Math.round(performance.now());

const isPasteDialogDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has(PASTE_DIALOG_DEBUG_QUERY_PARAM)) {
      return isDebugValueEnabled(searchParams.get(PASTE_DIALOG_DEBUG_QUERY_PARAM));
    }

    return isDebugValueEnabled(
      window.localStorage.getItem(PASTE_DIALOG_DEBUG_STORAGE_KEY),
    );
  } catch {
    return false;
  }
};

const debugPasteDialog = (event: string, details: DebugDetails = {}): void => {
  if (!isPasteDialogDebugEnabled()) {
    return;
  }

  console.debug('[trans-diff:paste-dialog]', event, {
    timestampMs: getDebugTimestamp(),
    ...details,
  });
};

export { debugPasteDialog, isPasteDialogDebugEnabled };
