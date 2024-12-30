import { useRef, useState, type ChangeEvent } from 'react';
import { Plus, Save } from 'lucide-react';
import type { Route } from './+types/home';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
interface TranslationData {
  [key: string]: string | TranslationData;
}

// Utility function to flatten nested objects with paths
const flattenObject = (
  obj: TranslationData,
  prefix = '',
): Record<string, string> => {
  return Object.keys(obj).reduce((acc: Record<string, string>, key: string) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      Object.assign(acc, flattenObject(value, newKey));
    } else {
      acc[newKey] = value as string;
    }

    return acc;
  }, {});
};

// Get the parent path of a key
const getParentPath = (path: string): string => {
  const parts = path.split('.');
  return parts.slice(0, -1).join('.');
};

// Group flattened keys by their parent paths
const groupByParent = (
  flatData: Record<string, string>,
): Record<string, Record<string, string>> => {
  const groups: Record<string, Record<string, string>> = {};

  for (const [key, value] of Object.entries(flatData)) {
    const parentPath = getParentPath(key);
    if (!groups[parentPath]) {
      groups[parentPath] = {};
    }
    groups[parentPath][key] = value;
  }

  return groups;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Trans Diff' },
    { name: 'description', content: 'A tool to compare translations' },
  ];
}

const unflattenObject = (obj: Record<string, string>): TranslationData => {
  const result: TranslationData = {};

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
};

const TranslationGroup = ({
  groupKey,
  entries,
  otherFileEntries = {},
  isLeft,
  onValueChange,
}: {
  groupKey: string;
  entries: Record<string, string>;
  otherFileEntries?: Record<string, string>;
  isLeft: boolean;
  onValueChange: (key: string, value: string) => void;
}) => {
  const allKeys = new Set([
    ...Object.keys(entries),
    ...Object.keys(otherFileEntries),
  ]);

  return (
    <div className='mb-4'>
      {groupKey && (
        <div className='font-medium text-sm text-gray-600 mb-2 pl-2'>
          {groupKey}
        </div>
      )}
      <div className='space-y-1 pl-4'>
        {Array.from(allKeys)
          .sort()
          .map((key) => {
            const hasKey = key in entries;
            const value = entries[key];
            const isMissing = !hasKey;

            return (
              <div
                key={key}
                className={`p-3 rounded relative overflow-hidden
                  ${isMissing ? 'bg-red-50' : 'bg-gray-50'}
                  ${isMissing ? 'min-h-[4rem]' : ''}
                `}
              >
                {isMissing && (
                  <div
                    className='absolute inset-0 opacity-20'
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 8px,
                        rgba(239, 68, 68, 0.2) 8px,
                        rgba(239, 68, 68, 0.2) 16px
                      )`,
                    }}
                  />
                )}
                <div className='relative z-10'>
                  <div className='font-medium text-sm text-gray-700 mb-2'>
                    {key.split('.').pop()}
                  </div>
                  {!isMissing ? (
                    <Input
                      value={value}
                      onChange={(e) => onValueChange(key, e.target.value)}
                      className='text-sm'
                    />
                  ) : (
                    <Input
                      placeholder='Add translation'
                      onChange={(e) => onValueChange(key, e.target.value)}
                      className='text-sm'
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const TranslationViewer = ({
  data,
  otherFileData,
  fileName,
  isLeft,
  containerRef,
  onScroll,
  onSave,
  onDataChange,
}: {
  data: TranslationData;
  otherFileData?: TranslationData;
  fileName: string;
  isLeft: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onScroll: (scrollTop: number) => void;
  onSave: () => void;
  onDataChange: (newData: TranslationData) => void;
}) => {
  const flatData = flattenObject(data);
  const flatOtherData = otherFileData ? flattenObject(otherFileData) : {};
  const groups = groupByParent(flatData);
  const otherGroups = otherFileData ? groupByParent(flatOtherData) : {};
  const allGroupKeys = new Set([
    ...Object.keys(groups),
    ...Object.keys(otherGroups),
  ]);

  const handleValueChange = (key: string, value: string) => {
    const newFlatData = { ...flatData, [key]: value };
    const newData = unflattenObject(newFlatData);
    onDataChange(newData);
  };

  return (
    <Card className='h-full'>
      <CardContent className='p-4 h-full'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>{fileName}</h2>
          <div className='flex items-center gap-4'>
            <span className='text-sm text-gray-500'>
              {Object.keys(flatData).length} keys
            </span>
            <Button onClick={onSave} size='sm'>
              <Save className='h-4 w-4 mr-2' />
              Save
            </Button>
          </div>
        </div>
        <div
          ref={containerRef}
          onScroll={(e) => onScroll(e.currentTarget.scrollTop)}
          className='overflow-y-auto h-[calc(100vh-12rem)]'
        >
          {Array.from(allGroupKeys)
            .sort()
            .map((groupKey) => (
              <TranslationGroup
                key={groupKey}
                groupKey={groupKey}
                entries={groups[groupKey] || {}}
                otherFileEntries={otherGroups[groupKey] || {}}
                isLeft={isLeft}
                onValueChange={handleValueChange}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const [file1, setFile1] = useState<TranslationData | null>(null);
  const [file2, setFile2] = useState<TranslationData | null>(null);
  const [fileName1, setFileName1] = useState<string>('');
  const [fileName2, setFileName2] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const handleScroll = (scrollTop: number, isLeft: boolean) => {
    if (isScrolling.current) return;

    isScrolling.current = true;

    if (isLeft && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = scrollTop;
    } else if (!isLeft && leftScrollRef.current) {
      leftScrollRef.current.scrollTop = scrollTop;
    }

    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  };

  const handleSave = (data: TranslationData, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modified_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (
    event: ChangeEvent<HTMLInputElement>,
    fileNum: 1 | 2,
  ): void => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const json = JSON.parse(
            e.target?.result as string,
          ) as TranslationData;
          if (fileNum === 1) {
            setFile1(json);
            setFileName1(file.name);
          } else {
            setFile2(json);
            setFileName2(file.name);
          }
          setError(null);
        } catch (err) {
          setError(
            `Error parsing JSON from ${file.name}: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`,
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const renderFileUploadButton = (fileNum: 1 | 2) => (
    <div className='flex flex-col items-center justify-center h-full'>
      <input
        type='file'
        accept='.json'
        onChange={(e) => handleFileUpload(e, fileNum)}
        className='hidden'
        id={`file-upload-${fileNum}`}
      />
      <label
        htmlFor={`file-upload-${fileNum}`}
        className='cursor-pointer w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-solid'
      >
        <Plus className='h-12 w-12' />
        <span className='text-sm'>Add JSON</span>
      </label>
    </div>
  );

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      {error && (
        <Alert variant='destructive' className='mb-6'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={`max-w-7xl mx-auto ${
          file1
            ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
            : 'flex justify-center items-center'
        }`}
      >
        <div
          className={`min-h-[calc(100vh-8rem)] ${
            !file1 ? 'flex items-center justify-center' : ''
          }`}
        >
          {file1 ? (
            <TranslationViewer
              data={file1}
              otherFileData={file2 || undefined}
              fileName={fileName1}
              isLeft={true}
              containerRef={leftScrollRef as React.RefObject<HTMLDivElement>}
              onScroll={(scrollTop) => handleScroll(scrollTop, true)}
              onSave={() => handleSave(file1, fileName1)}
              onDataChange={setFile1}
            />
          ) : (
            renderFileUploadButton(1)
          )}
        </div>

        {file1 && (
          <div className='min-h-[calc(100vh-8rem)]'>
            {file2 ? (
              <TranslationViewer
                data={file2}
                otherFileData={file1}
                fileName={fileName2}
                isLeft={false}
                containerRef={rightScrollRef as React.RefObject<HTMLDivElement>}
                onScroll={(scrollTop) => handleScroll(scrollTop, false)}
                onSave={() => handleSave(file2, fileName2)}
                onDataChange={setFile2}
              />
            ) : (
              renderFileUploadButton(2)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
