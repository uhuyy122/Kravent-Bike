export type AppSessionRole = 'customer' | 'karyawan' | 'admin';
export type StaffRole = Exclude<AppSessionRole, 'customer'>;

const sessionStorageKey = 'kravent-tidb-session';

interface StoredSession {
  token: string;
  expiresAt: number;
  role: AppSessionRole;
}

let sessionRequest: Promise<StoredSession> | undefined;
let legacySessionMigrated = false;
let sessionMigratedFromSharedStorage = false;

const isSessionRole = (role: unknown): role is AppSessionRole =>
  role === 'customer' || role === 'karyawan' || role === 'admin';

const getStoredSession = (): StoredSession | null => {
  let stored = sessionStorage.getItem(sessionStorageKey);
  if (!legacySessionMigrated) {
    const legacySession = localStorage.getItem(sessionStorageKey);
    if (!stored && legacySession) {
      stored = legacySession;
      sessionMigratedFromSharedStorage = true;
      sessionStorage.setItem(sessionStorageKey, legacySession);
    }
    localStorage.removeItem(sessionStorageKey);
    legacySessionMigrated = true;
  }
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as Partial<StoredSession>;
    return typeof session.token === 'string' &&
      typeof session.expiresAt === 'number' &&
      /^[A-Za-z0-9_-]{43}$/.test(session.token)
      ? {
          token: session.token,
          expiresAt: session.expiresAt,
          role: isSessionRole(session.role) ? session.role : 'customer',
        }
      : null;
  } catch {
    return null;
  }
};

const storeSession = (session: StoredSession) => {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
};

const parseSessionResponse = async (response: Response): Promise<StoredSession> => {
  const result = await response.json() as {
    token?: unknown;
    expiresAt?: unknown;
    role?: unknown;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error || `Gagal membuat sesi (${response.status}).`);
  }
  if (
    typeof result.token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(result.token) ||
    typeof result.expiresAt !== 'number' ||
    !isSessionRole(result.role)
  ) {
    throw new Error('Respons sesi database tidak valid.');
  }

  const session: StoredSession = {
    token: result.token,
    expiresAt: result.expiresAt,
    role: result.role,
  };
  return session;
};

const createOrRefreshSession = async (forceRefresh = false): Promise<StoredSession> => {
  const current = getStoredSession();
  if (!forceRefresh && current && current.expiresAt - Date.now() > 24 * 60 * 60_000) {
    return current;
  }

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      ...(current ? { Authorization: `Bearer ${current.token}` } : {}),
    },
  });
  const session = await parseSessionResponse(response);
  storeSession(session);
  return session;
};

const getSession = (forceRefresh = false): Promise<StoredSession> => {
  if (sessionRequest && !forceRefresh) return sessionRequest;

  const request = createOrRefreshSession(forceRefresh);
  sessionRequest = request;
  void request.then(
    () => {
      if (sessionRequest === request) sessionRequest = undefined;
    },
    () => {
      if (sessionRequest === request) sessionRequest = undefined;
    }
  );
  return request;
};

export const getSessionToken = async (): Promise<string> =>
  (await getSession()).token;

export const getSessionRole = async (): Promise<AppSessionRole> =>
  (await getSession(true)).role;

export const authenticateStaff = async (role: StaffRole, pin: string): Promise<void> => {
  const session = await getSession();
  const response = await fetch('/api/auth/staff-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, pin }),
  });
  const result = await response.json() as { role?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(result.error || `Gagal memverifikasi PIN (${response.status}).`);
  }
  if (result.role !== role) {
    throw new Error('Respons verifikasi akses tidak valid.');
  }
  storeSession({ ...session, role });
};

export const switchToCustomerSession = async (): Promise<void> => {
  const session = await getSession(true);
  if (session.role === 'customer' && !sessionMigratedFromSharedStorage) return;

  const response = await fetch('/api/auth/session', { method: 'POST' });
  const customerSession = await parseSessionResponse(response);
  if (customerSession.role !== 'customer') {
    throw new Error('Sesi pelanggan baru tidak valid.');
  }
  storeSession(customerSession);
  sessionMigratedFromSharedStorage = false;
};
