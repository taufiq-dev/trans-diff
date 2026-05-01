import { matchSorter } from 'match-sorter';

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export type PathSegment = string | number;
export type JsonPath = PathSegment[];
export type ValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array';

export type TranslationFile = {
  id: string;
  data: JsonValue;
  fileName: string;
};

type SearchFilter = {
  matchCount: number;
  visiblePathKeys: Set<string>;
};

type SearchablePath = {
  arrayAccessPath: string;
  dottedPath: string;
  formattedPath: string;
  indexlessPath: string;
  path: JsonPath;
  segment: string;
};

export const MISSING = Symbol('missing');
export type Missing = typeof MISSING;

export const VALUE_KINDS: ValueKind[] = [
  'string',
  'number',
  'boolean',
  'null',
  'object',
  'array',
];

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return Number.isFinite(value) || typeof value !== 'number';
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isJsonObject(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

export const cloneJson = <T extends JsonValue>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const normalizeJsonFileName = (fileName: string): string => {
  const trimmedFileName = fileName.trim() || 'pasted.json';
  return trimmedFileName.match(/\.json$/i)
    ? trimmedFileName
    : `${trimmedFileName}.json`;
};

export const createDefaultValue = (kind: ValueKind): JsonValue => {
  switch (kind) {
    case 'array':
      return [];
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'number':
      return 0;
    case 'object':
      return {};
    case 'string':
      return '';
  }
};

export const getValueKind = (value: JsonValue): ValueKind => {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (isJsonObject(value)) {
    return 'object';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  return 'boolean';
};

export const coerceValue = (
  value: JsonValue | Missing,
  kind: ValueKind,
): JsonValue => {
  if (value === MISSING) {
    return createDefaultValue(kind);
  }

  if (kind === 'string') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  if (kind === 'number') {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    }

    return 0;
  }

  if (kind === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return Boolean(value);
  }

  return createDefaultValue(kind);
};

export const getValueAtPath = (
  root: JsonValue,
  path: JsonPath,
): JsonValue | Missing => {
  let current: JsonValue | undefined = root;

  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || segment >= current.length) {
        return MISSING;
      }
      current = current[segment];
      continue;
    }

    if (!isJsonObject(current) || !(segment in current)) {
      return MISSING;
    }
    current = current[segment];
  }

  return current === undefined ? MISSING : current;
};

const defaultContainerFor = (segment: PathSegment | undefined): JsonValue =>
  typeof segment === 'number' ? [] : {};

export const setValueAtPath = (
  current: JsonValue | Missing,
  path: JsonPath,
  value: JsonValue,
): JsonValue => {
  if (path.length === 0) {
    return value;
  }

  const [segment, ...rest] = path;

  if (typeof segment === 'number') {
    const next = Array.isArray(current) ? [...current] : [];
    next[segment] = setValueAtPath(
      next[segment] ?? defaultContainerFor(rest[0]),
      rest,
      value,
    );
    return next;
  }

  const next = isJsonObject(current) ? { ...current } : {};
  next[segment] = setValueAtPath(
    next[segment] ?? defaultContainerFor(rest[0]),
    rest,
    value,
  );
  return next;
};

export const removeValueAtPath = (
  current: JsonValue,
  path: JsonPath,
): JsonValue => {
  if (path.length === 0) {
    return {};
  }

  const [segment, ...rest] = path;

  if (typeof segment === 'number') {
    if (!Array.isArray(current)) {
      return current;
    }

    const next = [...current];
    if (rest.length === 0) {
      next.splice(segment, 1);
    } else {
      next[segment] = removeValueAtPath(next[segment], rest);
    }
    return next;
  }

  if (!isJsonObject(current) || !(segment in current)) {
    return current;
  }

  const next = { ...current };
  if (rest.length === 0) {
    delete next[segment];
  } else {
    next[segment] = removeValueAtPath(next[segment], rest);
  }
  return next;
};

export const renameKeyAtPath = (
  current: JsonValue,
  path: JsonPath,
  nextKey: string,
): JsonValue => {
  const oldKey = path[path.length - 1];
  const parentPath = path.slice(0, -1);

  if (typeof oldKey !== 'string' || !nextKey.trim()) {
    return current;
  }

  const parent = getValueAtPath(current, parentPath);
  if (!isJsonObject(parent) || !(oldKey in parent)) {
    return current;
  }

  if (nextKey !== oldKey && nextKey in parent) {
    return current;
  }

  const renamedParent = Object.entries(parent).reduce<JsonObject>(
    (acc, [key, value]) => {
      acc[key === oldKey ? nextKey : key] = value;
      return acc;
    },
    {},
  );

  return setValueAtPath(current, parentPath, renamedParent);
};

export const moveArrayItem = (
  current: JsonValue,
  parentPath: JsonPath,
  index: number,
  direction: -1 | 1,
): JsonValue => {
  const parent = getValueAtPath(current, parentPath);
  const nextIndex = index + direction;

  if (!Array.isArray(parent) || nextIndex < 0 || nextIndex >= parent.length) {
    return current;
  }

  const next = [...parent];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return setValueAtPath(current, parentPath, next);
};

export const insertArrayItem = (
  current: JsonValue,
  path: JsonPath,
  value: JsonValue,
): JsonValue => {
  const existing = getValueAtPath(current, path);
  const next = Array.isArray(existing) ? [...existing, value] : [value];
  return setValueAtPath(current, path, next);
};

export const duplicateValue = (
  current: JsonValue,
  parentPath: JsonPath,
  index: number,
): JsonValue => {
  const parent = getValueAtPath(current, parentPath);

  if (!Array.isArray(parent) || !(index in parent)) {
    return current;
  }

  const next = [...parent];
  next.splice(index + 1, 0, cloneJson(parent[index]));
  return setValueAtPath(current, parentPath, next);
};

export const pathToKey = (path: JsonPath): string => JSON.stringify(path);

export const draftKey = (fileId: string, path: JsonPath): string =>
  `${fileId}:${pathToKey(path)}`;

export const formatPath = (path: JsonPath): string => {
  if (path.length === 0) {
    return '$';
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }

    return `${acc}.${segment}`;
  }, '$');
};

export const formatDottedPath = (path: JsonPath): string =>
  path.map((segment) => String(segment)).join('.');

const formatArrayAccessPath = (path: JsonPath): string =>
  path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }

    return acc ? `${acc}.${segment}` : segment;
  }, '');

const formatIndexlessPath = (path: JsonPath): string =>
  path
    .filter((segment): segment is string => typeof segment === 'string')
    .join('.');

export const formatSegment = (segment: PathSegment | undefined): string => {
  if (segment === undefined) {
    return 'Root';
  }

  return typeof segment === 'number' ? `[${segment}]` : segment;
};

export const countLeaves = (value: JsonValue): number => {
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (total, item) => total + countLeaves(item),
      0,
    );
  }

  if (isJsonObject(value)) {
    return Object.values(value).reduce<number>(
      (total, item) => total + countLeaves(item),
      0,
    );
  }

  return 1;
};

export const getJsonValueDebugSummary = (value: JsonValue): string => {
  if (Array.isArray(value)) {
    return `array:${value.length}`;
  }

  if (isJsonObject(value)) {
    return `object:${Object.keys(value).length}`;
  }

  return getValueKind(value);
};

export const collectChildSegments = (
  files: TranslationFile[],
  path: JsonPath,
): PathSegment[] => {
  const segments = new Set<PathSegment>();

  for (const file of files) {
    const value = getValueAtPath(file.data, path);

    if (Array.isArray(value)) {
      value.forEach((_, index) => segments.add(index));
    } else if (isJsonObject(value)) {
      Object.keys(value).forEach((key) => segments.add(key));
    }
  }

  return Array.from(segments).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    if (typeof a === 'number') {
      return -1;
    }

    if (typeof b === 'number') {
      return 1;
    }

    return a.localeCompare(b);
  });
};

export const collectVisiblePaths = (files: TranslationFile[]): JsonPath[] => {
  if (files.length === 0) {
    return [];
  }

  const paths: JsonPath[] = [[]];

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    const childSegments = collectChildSegments(files, path);

    childSegments.forEach((segment) => {
      paths.push([...path, segment]);
    });
  }

  return paths;
};

export const getPathStatus = (
  files: TranslationFile[],
  path: JsonPath,
): { label: string; tone: 'default' | 'danger' | 'warning' | 'success' } => {
  const values = files.map((file) => getValueAtPath(file.data, path));
  const missingCount = values.filter((value) => value === MISSING).length;

  if (missingCount === values.length) {
    return { label: 'Missing', tone: 'danger' };
  }

  if (missingCount > 0) {
    return { label: `${missingCount} missing`, tone: 'warning' };
  }

  const kinds = new Set(
    values.map((value) => getValueKind(value as JsonValue)),
  );

  if (kinds.size > 1) {
    return { label: 'Type mismatch', tone: 'warning' };
  }

  return { label: 'Synced', tone: 'success' };
};

export const countNotSyncedPaths = (files: TranslationFile[]): number =>
  collectVisiblePaths(files).filter((path) => {
    const status = getPathStatus(files, path);
    return (
      status.label !== 'Synced' &&
      !status.label.toLowerCase().includes('missing')
    );
  }).length;

const isDescendantPath = (path: JsonPath, ancestorPath: JsonPath): boolean =>
  path.length > ancestorPath.length &&
  ancestorPath.every((segment, index) => path[index] === segment);

export const createSearchFilter = (
  paths: JsonPath[],
  query: string,
): SearchFilter | null => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const searchablePaths: SearchablePath[] = paths
    .filter((path) => path.length > 0)
    .map((path) => ({
      arrayAccessPath: formatArrayAccessPath(path),
      dottedPath: formatDottedPath(path),
      formattedPath: formatPath(path),
      indexlessPath: formatIndexlessPath(path),
      path,
      segment: formatSegment(path[path.length - 1]),
    }));
  const matchedPaths = matchSorter(searchablePaths, trimmedQuery, {
    keys: [
      'segment',
      'dottedPath',
      'arrayAccessPath',
      'indexlessPath',
      'formattedPath',
    ],
  });
  const visiblePathKeys = new Set<string>();

  matchedPaths.forEach((matchedPath) => {
    for (let index = 0; index <= matchedPath.path.length; index += 1) {
      visiblePathKeys.add(pathToKey(matchedPath.path.slice(0, index)));
    }
  });

  paths.forEach((path) => {
    if (
      matchedPaths.some((matchedPath) =>
        isDescendantPath(path, matchedPath.path),
      )
    ) {
      visiblePathKeys.add(pathToKey(path));
    }
  });

  return {
    matchCount: matchedPaths.length,
    visiblePathKeys,
  };
};

export const getSuggestedKind = (
  files: TranslationFile[],
  path: JsonPath,
): ValueKind => {
  for (const file of files) {
    const value = getValueAtPath(file.data, path);
    if (value !== MISSING) {
      return getValueKind(value);
    }
  }

  return 'string';
};
