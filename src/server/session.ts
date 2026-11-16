import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getTiDBPool } from './tidb.js';

const sessionLifetimeMs = 90 * 24 * 60 * 60_000;

interface SessionRow extends RowDataPacket {
  uid: string;
  role: SessionRole;
  role_expires_at_ms: number | string | null;
}

export type SessionRole = 'customer' | 'karyawan' | 'admin';
const staffRoleLifetimeMs = 12 * 60 * 60_000;

interface SessionRequest {
  headers: Record<string, string | string[] | undefined>;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const getVerifiedSession = async (
  request: SessionRequest
): Promise<{ uid: string; role: SessionRole }> => {
  const authorization = request.headers.authorization;
  const token = (Array.isArray(authorization) ? authorization[0] : authorization)
    ?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Autentikasi database dibutuhkan.');

  const session = await getSession(token);
  if (!session) throw new Error('Autentikasi database tidak valid.');
  return session;
};

export const getSession = async (
  token: string
): Promise<{ uid: string; role: SessionRole } | null> => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const [rows] = await getTiDBPool().execute<SessionRow[]>(
    `SELECT uid, role, role_expires_at_ms
     FROM app_sessions
     WHERE token_hash = ? AND expires_at_ms > ?
     LIMIT 1`,
    [hashToken(token), Date.now()]
  );
  const session = rows[0];
  if (!session) return null;
  let role: SessionRole = session.role === 'admin' || session.role === 'karyawan'
    ? session.role
    : 'customer';
  if (
    role !== 'customer' &&
    (!session.role_expires_at_ms || Number(session.role_expires_at_ms) <= Date.now())
  ) {
    role = 'customer';
    await getTiDBPool().execute(
      `UPDATE app_sessions
       SET role = 'customer', role_expires_at_ms = NULL
       WHERE uid = ?
         AND role IN ('admin', 'karyawan')
         AND (role_expires_at_ms IS NULL OR role_expires_at_ms <= ?)`,
      [session.uid, Date.now()]
    );
  }
  return { uid: session.uid, role };
};

export const getSessionUid = async (token: string): Promise<string | null> =>
  (await getSession(token))?.uid ?? null;

export const setSessionRole = async (uid: string, role: SessionRole): Promise<void> => {
  const roleExpiresAt = role === 'customer' ? null : Date.now() + staffRoleLifetimeMs;
  await getTiDBPool().execute(
    'UPDATE app_sessions SET role = ?, role_expires_at_ms = ? WHERE uid = ?',
    [role, roleExpiresAt, uid]
  );
};

export const issueOrRefreshSession = async (
  existingUid: string | null,
  existingToken: string | undefined
): Promise<{ token: string; expiresAt: number }> => {
  const now = Date.now();
  const expiresAt = now + sessionLifetimeMs;

  if (existingUid && existingToken) {
    await getTiDBPool().execute(
      'UPDATE app_sessions SET expires_at_ms = ? WHERE uid = ? AND token_hash = ?',
      [expiresAt, existingUid, hashToken(existingToken)]
    );
    return { token: existingToken, expiresAt };
  }

  const uid = randomUUID();
  const token = randomBytes(32).toString('base64url');
  await getTiDBPool().execute(
    'DELETE FROM app_sessions WHERE expires_at_ms <= ?',
    [now]
  );
  await getTiDBPool().execute(
    `INSERT INTO app_sessions (uid, token_hash, expires_at_ms, role)
     VALUES (?, ?, ?, 'customer')`,
    [uid, hashToken(token), expiresAt]
  );
  return { token, expiresAt };
};
