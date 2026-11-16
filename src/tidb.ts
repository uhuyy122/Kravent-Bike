import { getSessionToken } from './session';

interface DocumentReference {
  collectionName: string;
  id: string;
}

interface CollectionReference {
  collectionName: string;
  id?: never;
}

interface DocumentSnapshot<T> {
  id: string;
  data: () => T;
  exists: () => boolean;
}

interface QuerySnapshot<T> {
  docs: DocumentSnapshot<T>[];
  empty: boolean;
  forEach: (callback: (snapshot: DocumentSnapshot<T>) => void) => void;
}

type DataReference = DocumentReference | CollectionReference;
type SnapshotHandler<T> = {
  bivarianceHack(snapshot: T): void;
}['bivarianceHack'];

const apiUrl = '/api/data';

const request = async <T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  params: Record<string, string>,
  body?: Record<string, unknown>
): Promise<T> => {
  const token = await getSessionToken();
  const url = new URL(apiUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as { error?: string } & T;
  if (!response.ok) {
    throw new Error(result.error || `Permintaan database gagal (${response.status}).`);
  }
  return result;
};

const toDocumentSnapshot = <T>(record: T & { id: string }): DocumentSnapshot<T> => ({
  id: record.id,
  data: () => record,
  exists: () => true,
});

export const db = {};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('TiDB operation failed:', JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  }));
}

export function cleanForFirestore<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export const collection = (_database: typeof db, collectionName: string): CollectionReference => ({
  collectionName,
});

export const doc = (
  _database: typeof db,
  collectionName: string,
  id: string
): DocumentReference => ({ collectionName, id });

export const setDoc = async <T extends object>(
  reference: DocumentReference,
  data: T,
  options?: { merge?: boolean }
) => request('POST', { collection: reference.collectionName }, {
  id: reference.id,
  data: { ...data },
  merge: options?.merge === true,
});

export const updateDoc = async <T extends object>(reference: DocumentReference, data: T) =>
  request('PATCH', { collection: reference.collectionName, id: reference.id }, { data: { ...data } });

export const deleteDoc = async (reference: DocumentReference) =>
  request('DELETE', { collection: reference.collectionName, id: reference.id });

export const clearProductionData = async () =>
  request<{ ok: boolean }>('POST', { action: 'clear-production-data' });

export const getDocs = async <T = Record<string, unknown>>(reference: CollectionReference): Promise<QuerySnapshot<T>> => {
  const result = await request<{ items: (T & { id: string })[] }>(
    'GET',
    { collection: reference.collectionName }
  );
  const docs = result.items.map(toDocumentSnapshot);
  return {
    docs,
    empty: docs.length === 0,
    forEach: callback => docs.forEach(callback),
  };
};

export const getDoc = async <T = Record<string, unknown>>(reference: DocumentReference): Promise<DocumentSnapshot<T>> => {
  const result = await request<{ item: (T & { id: string }) | null }>(
    'GET',
    { collection: reference.collectionName, id: reference.id }
  );
  return result.item
    ? toDocumentSnapshot(result.item)
    : { id: reference.id, data: () => undefined as T, exists: () => false };
};

export function onSnapshot<T = Record<string, unknown>>(
  reference: CollectionReference,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: Error) => void
): () => void;
export function onSnapshot<T = Record<string, unknown>>(
  reference: DocumentReference,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: Error) => void
): () => void;
export function onSnapshot<T = Record<string, unknown>>(
  reference: DataReference,
  onNext: SnapshotHandler<QuerySnapshot<T>> | SnapshotHandler<DocumentSnapshot<T>>,
  onError?: (error: Error) => void
) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const poll = async () => {
    try {
      if (reference.id !== undefined) {
        (onNext as SnapshotHandler<DocumentSnapshot<T>>)(await getDoc(reference));
      } else {
        (onNext as SnapshotHandler<QuerySnapshot<T>>)(await getDocs(reference));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (!stopped) timer = setTimeout(poll, 5_000);
    }
  };

  void poll();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
};
