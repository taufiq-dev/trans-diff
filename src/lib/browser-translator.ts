import {
  isJsonObject,
  type JsonArray,
  type JsonObject,
  type JsonValue,
} from '@/lib/json-tree';

export type TranslatorAvailability =
  | 'available'
  | 'downloadable'
  | 'unavailable';

export type LanguageOption = {
  code: string;
  label: string;
};

export type TranslationJob = {
  completed: number;
  downloadProgress: number | null;
  fileId: string;
  phase: 'checking' | 'downloading' | 'translating';
  total: number;
};

export type BuiltInTranslator = {
  destroy?: () => void;
  translate: (input: string) => Promise<string>;
};

export type BuiltInTranslatorFactory = {
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

export const TRANSLATOR_LANGUAGES: LanguageOption[] = [
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

export const getTranslatorFactory = (): BuiltInTranslatorFactory | null => {
  if (typeof self === 'undefined' || !('Translator' in self)) {
    return null;
  }

  return (self as unknown as { Translator: BuiltInTranslatorFactory }).Translator;
};

export const countTranslatableStrings = (value: JsonValue): number => {
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

export const translateJsonValue = async (
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

export const getTranslatedFileName = (
  fileName: string,
  targetLanguage: string,
): string =>
  fileName.match(/\.json$/i)
    ? fileName.replace(/\.json$/i, `.${targetLanguage}.json`)
    : `${fileName}.${targetLanguage}.json`;
