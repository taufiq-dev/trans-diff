import { useState } from 'react';
import {
  countTranslatableStrings,
  getTranslatedFileName,
  getTranslatorFactory,
  translateJsonValue,
  type BuiltInTranslator,
  type TranslationJob,
} from '@/lib/browser-translator';
import type { TranslationFile } from '@/lib/json-tree';

type UseTranslationOptions = {
  onError: (message: string) => void;
  onTranslated: (sourceFile: TranslationFile, translatedFile: TranslationFile) => void;
};

export function useTranslation({ onError, onTranslated }: UseTranslationOptions) {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [job, setJob] = useState<TranslationJob | null>(null);
  const isSupported = getTranslatorFactory() !== null;

  const translate = async (file: TranslationFile) => {
    const translatorFactory = getTranslatorFactory();

    if (!translatorFactory) {
      onError('Auto translate is not available in this browser.');
      return;
    }

    if (sourceLanguage === targetLanguage) {
      onError('Choose different source and target languages.');
      return;
    }

    const total = countTranslatableStrings(file.data);

    if (total === 0) {
      onError(`${file.fileName} has no non-empty string values to translate.`);
      return;
    }

    let translator: BuiltInTranslator | null = null;
    setJob({
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

      setJob((current) =>
        current
          ? {
              ...current,
              phase:
                availability === 'downloadable' ? 'downloading' : 'translating',
            }
          : current,
      );

      translator = await translatorFactory.create({
        sourceLanguage,
        targetLanguage,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            const progressEvent = event as ProgressEvent;
            const normalizedProgress =
              progressEvent.total > 0
                ? progressEvent.loaded / progressEvent.total
                : progressEvent.loaded;
            const downloadProgress =
              normalizedProgress <= 1
                ? Math.round(normalizedProgress * 100)
                : Math.round(normalizedProgress);

            setJob((current) =>
              current
                ? { ...current, downloadProgress, phase: 'downloading' }
                : current,
            );
          });
        },
      });

      setJob((current) =>
        current
          ? { ...current, downloadProgress: null, phase: 'translating' }
          : current,
      );

      const translatedData = await translateJsonValue(
        file.data,
        (text) => translator?.translate(text) ?? Promise.resolve(text),
        () =>
          setJob((current) =>
            current
              ? {
                  ...current,
                  completed: current.completed + 1,
                  phase: 'translating',
                }
              : current,
          ),
      );

      onTranslated(file, {
        data: translatedData,
        fileName: getTranslatedFileName(file.fileName, targetLanguage),
        id: `translated-${targetLanguage}-${crypto.randomUUID()}`,
      });
    } catch (translationError) {
      onError(
        translationError instanceof Error
          ? translationError.message
          : 'Unable to translate this file.',
      );
    } finally {
      translator?.destroy?.();
      setJob(null);
    }
  };

  return {
    isSupported,
    job,
    setSourceLanguage,
    setTargetLanguage,
    sourceLanguage,
    targetLanguage,
    translate,
  };
}
