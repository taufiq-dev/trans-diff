import { useState, type ChangeEvent } from 'react';
import { Plus, PlusCircle, Save, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menubar } from '@/components/ui/menubar';
import { cn } from '@/lib/utils';
import { overlayStore } from '@/stores/overlay-store';

type TranslationFile = {
  data: TranslationData;
  fileName: string;
};

type TranslationData = {
  [key: string]: string | TranslationData;
};

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

const getParentPath = (path: string): string => {
  const parts = path.split('.');
  return parts.slice(0, -1).join('.');
};

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

const TranslationHeader = ({
  fileName,
  keyCount,
  onAddKey,
  onSave,
  onRemove,
}: {
  fileName: string;
  keyCount: number;
  onAddKey: () => void;
  onSave: () => void;
  onRemove: () => void;
}) => (
  <div className='flex items-center justify-between p-4 border-b'>
    <div className='flex flex-col'>
      <h2 className='text-lg font-semibold'>{fileName}</h2>
      <span className='text-sm text-gray-500'>{keyCount} keys</span>
    </div>
    <div className='flex items-center gap-2'>
      <Button size='sm' variant='outline' onClick={onAddKey}>
        <Plus className='h-4 w-4 mr-2' />
        Add Key
      </Button>
      <Button onClick={onSave} size='sm' variant='default'>
        <Save className='h-4 w-4 mr-2' />
        Save
      </Button>
      <Button onClick={onRemove} size='sm' variant='destructive'>
        <Trash2 className='h-4 w-4 mr-2' />
        Remove
      </Button>
    </div>
  </div>
);

const TranslationGroup = ({
  groupKey,
  entries,
  otherFilesEntries = [],
  onValueChange,
  onKeyChange,
  onRemove,
  onAdd,
}: {
  groupKey: string;
  entries: Record<string, string>;
  otherFilesEntries: Record<string, string>[];
  onValueChange: (key: string, value: string) => void;
  onKeyChange: (oldKey: string, newKey: string) => void;
  onRemove: (key: string) => void;
  onAdd: (key: string, value: string | object) => void;
}) => {
  const openAddKeyDialog = () =>
    overlayStore.send({
      type: 'openAddKeyDialog',
      onAdd,
      parentPath: groupKey,
    });
  const allKeys = new Set([
    ...Object.keys(entries),
    ...otherFilesEntries.flatMap((entries) => Object.keys(entries)),
  ]);

  return (
    <div className='mb-4'>
      {groupKey && (
        <div className='font-medium text-sm text-gray-600 mb-2 flex justify-between items-center'>
          <span>{groupKey}</span>
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2'
            onClick={openAddKeyDialog}
          >
            <PlusCircle className='h-4 w-4 mr-1' />
            Add Key
          </Button>
        </div>
      )}
      <div className='space-y-2'>
        {Array.from(allKeys)
          .sort()
          .map((key) => {
            const hasKey = key in entries;
            const value = entries[key];
            const isMissing = !hasKey;
            const keyName = key.split('.').pop() || '';

            return (
              <div
                key={key}
                className={cn(
                  'p-3 rounded-md relative overflow-hidden',
                  isMissing ? 'bg-red-50' : 'bg-slate-100',
                )}
              >
                {isMissing && (
                  <div
                    className='absolute inset-0 opacity-30'
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 8px,
                        rgba(239, 68, 68, 0.5) 8px,
                        rgba(239, 68, 68, 0.5) 16px
                      )`,
                    }}
                  />
                )}
                <div className='relative z-10 space-y-2'>
                  <div className='grid grid-cols-[35px_1fr_30px] gap-2 items-center'>
                    <p className='text-xs font-medium text-gray-500'>Key</p>
                    <Input
                      value={keyName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newKey = getParentPath(key)
                          ? `${getParentPath(key)}.${e.target.value}`
                          : e.target.value;
                        onKeyChange(key, newKey);
                      }}
                      className='text-sm font-medium bg-slate-200 border-gray-300'
                    />
                    {!isMissing && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onRemove(key)}
                        className='h-8 w-8 p-0'
                      >
                        <Trash2 className='h-4 w-4 text-red-500' />
                      </Button>
                    )}
                  </div>
                  <div className='grid grid-cols-[35px_1fr_30px] gap-2 items-center'>
                    <p className='text-xs font-medium text-gray-500'>Value</p>
                    <Input
                      value={value || ''}
                      placeholder={isMissing ? 'Add translation' : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.value === '') {
                          onRemove(key);
                        } else {
                          onValueChange(key, e.target.value);
                        }
                      }}
                      className='text-sm bg-white'
                    />
                    <div /> {/* Empty div to maintain grid alignment */}
                  </div>
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
  otherFilesData,
  fileName,
  onSave,
  onDataChange,
  onRemove,
}: {
  data: TranslationData;
  otherFilesData: TranslationData[];
  fileName: string;
  onSave: () => void;
  onDataChange: (newData: TranslationData) => void;
  onRemove: () => void;
}) => {
  const flatData = flattenObject(data);
  const groups = groupByParent(flatData);
  const otherGroups = otherFilesData.map((data) =>
    groupByParent(flattenObject(data)),
  );
  const allGroupKeys = new Set([
    ...Object.keys(groups),
    ...otherGroups.flatMap((group) => Object.keys(group)),
  ]);

  const handleValueChange = (key: string, value: string) => {
    const newFlatData = { ...flatData, [key]: value };
    const newData = unflattenObject(newFlatData);
    onDataChange(newData);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const newFlatData = { ...flatData };
    const value = newFlatData[oldKey];
    delete newFlatData[oldKey];
    newFlatData[newKey] = value;
    const newData = unflattenObject(newFlatData);
    onDataChange(newData);
  };

  const handleRemove = (key: string) => {
    const newFlatData = { ...flatData };
    delete newFlatData[key];
    const newData = unflattenObject(newFlatData);
    onDataChange(newData);
  };

  const handleAdd = (key: string, value: string | object) => {
    const newFlatData = { ...flatData };
    if (typeof value === 'string') {
      newFlatData[key] = value;
    } else {
      newFlatData[`${key}.placeholder`] = '';
    }
    const newData = unflattenObject(newFlatData);
    onDataChange(newData);
  };

  const openAddKeyDialog = () =>
    overlayStore.send({
      type: 'openAddKeyDialog',
      onAdd: handleAdd,
    });

  return (
    <Card className='h-full flex flex-col'>
      <TranslationHeader
        fileName={fileName}
        keyCount={Object.keys(flatData).length}
        onAddKey={openAddKeyDialog}
        onSave={onSave}
        onRemove={onRemove}
      />
      <CardContent className='flex-1 overflow-hidden'>
        <div className='h-full'>
          {Array.from(allGroupKeys)
            .sort()
            .map((groupKey) => (
              <TranslationGroup
                key={groupKey}
                groupKey={groupKey}
                entries={groups[groupKey] || {}}
                otherFilesEntries={otherGroups.map(
                  (group) => group[groupKey] || {},
                )}
                onValueChange={handleValueChange}
                onKeyChange={handleKeyChange}
                onRemove={handleRemove}
                onAdd={handleAdd}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const [files, setFiles] = useState<TranslationFile[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const json = JSON.parse(
            e.target?.result as string,
          ) as TranslationData;
          setFiles((prev) => [...prev, { data: json, fileName: file.name }]);
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

  const handleDataChange = (index: number, newData: TranslationData) => {
    setFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, data: newData } : file)),
    );
  };

  const renderFileUploadButton = () => (
    <div className='flex flex-col items-center justify-center border-dashed max-h-60 border-2 rounded-lg hover:border-blue-200 p-4'>
      <input
        type='file'
        accept='.json'
        onChange={handleFileUpload}
        className='hidden'
        id='file-upload'
      />
      <label
        htmlFor='file-upload'
        className='cursor-pointer w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-inherit'
      >
        <Plus className='h-12 w-12' />
        <span className='text-sm'>Add JSON</span>
      </label>
    </div>
  );

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className='h-screen flex flex-col'>
      <Menubar className='px-4 flex flex-row gap-4'>
        <h4 className='text-lg font-semibold'>Trans Diff</h4>
        <p className='text-sm text-gray-500'>
          A tool to compare and edit translations
        </p>
      </Menubar>

      {error && (
        <Alert variant='destructive' className='m-4'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='flex-1 p-4 overflow-auto'>
        <div className='flex flex-row'>
          {files.map((file, index) => (
            <div key={`${file.fileName}-${index}`}>
              <TranslationViewer
                data={file.data}
                otherFilesData={files
                  .filter((_, i) => i !== index)
                  .map((f) => f.data)}
                fileName={file.fileName}
                onSave={() => handleSave(file.data, file.fileName)}
                onDataChange={(newData) => handleDataChange(index, newData)}
                onRemove={() => handleRemoveFile(index)}
              />
            </div>
          ))}
          {renderFileUploadButton()}
        </div>
      </div>
    </div>
  );
}
