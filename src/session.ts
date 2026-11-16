const sessionStorageKey = 'kravent-tidb-session';

interface StoredSession {
  token: string;
  expiresAt: number;
}

let sessionRequest: Promise<string> | undefined;

const getStoredSession = (): StoredSession | null => {
  const stored = localStorage.getItem(sessionStorageKey);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as StoredSession;
    return typeof session.token === 'string' &&
      typeof session.expiresAt === 'number' &&
      /^[A-Za-z0-9_-]{43}$/.test(session.token)
      ? session
      : null;
  } catch {
    return null;
  }
};

const createOrRefreshSession = async (): Promise<string> => {
  const current = getStoredSession();
  if (current && current.expiresAt - Date.now() > 24 * 60 * 60_000) {
    return current.token;
  }

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      ...(current ? { Authorization: `Bearer ${current.token}` } : {}),
    },
  });
  const result = await response.json() as { token?: unknown; expiresAt?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(result.error || `Gagal membuat sesi (${response.status}).`);
  }
  if (
    typeof result.token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(result.token) ||
    typeof result.expiresAt !== 'number'
  ) {
    throw new Error('Respons sesi database tidak valid.');
  }

  localStorage.setItem(sessionStorageKey, JSON.stringify({
    token: result.token,
    expiresAt: result.expiresAt,
  }));
  return result.token;
};

export const getSessionToken = (): Promise<string> => {
  if (!sessionRequest) {
    sessionRequest = createOrRefreshSession().finally(() => {
      sessionRequest = undefined;
    });
  }
  return sessionRequest;
};
