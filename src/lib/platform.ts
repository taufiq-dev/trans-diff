// True on macOS and iOS, where the option key is labelled ⌥ rather than Alt.
export const isApplePlatform: boolean =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const ALT_KEY_LABEL = isApplePlatform ? '⌥' : 'Alt';
