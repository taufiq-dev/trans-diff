type DebugDetails = Record<string, boolean | null | number | string | undefined>;

const PASTE_DIALOG_DEBUG_KEY = 'debugPasteDialog';
const DISABLED_DEBUG_VALUES = new Set(['0', 'false', 'no', 'off']);

const isDebugValueEnabled = (value: string | null | undefined): boolean =>
  value !== null &&
  value !== undefined &&
  !DISABLED_DEBUG_VALUES.has(value.toLowerCase());

const getDebugTimestamp = (): number =>
  typeof performance === 'undefined' ? Date.now() : Math.round(performance.now());

const getPasteDialogDebugValue = (): string | null | undefined => {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = searchParams.get(PASTE_DIALOG_DEBUG_KEY);

  if (queryValue !== null) {
    return queryValue;
  }

  return (
    window.localStorage.getItem(PASTE_DIALOG_DEBUG_KEY) ??
    (window.localStorage as unknown as Record<string, string | undefined>)[
      PASTE_DIALOG_DEBUG_KEY
    ]
  );
};

const isPasteDialogDebugEnabled = (): boolean => {
  try {
    return isDebugValueEnabled(getPasteDialogDebugValue());
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
