import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getTiDBPool } from './tidb.js';

const sessionLifetimeMs = 90 * 24 * 60 * 60_000;

interface SessionRow extends RowDataPacket {
  uid: string;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const getSessionUid = async (token: string): Promise<string | null> => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const [rows] = await getTiDBPool().execute<SessionRow[]>(
    `SELECT uid
     FROM app_sessions
     WHERE token_hash = ? AND expires_at_ms > ?
     LIMIT 1`,
    [hashToken(token), Date.now()]
  );
  return rows[0]?.uid ?? null;
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
    `INSERT INTO app_sessions (uid, token_hash, expires_at_ms)
     VALUES (?, ?, ?)`,
    [uid, hashToken(token), expiresAt]
  );
  return { token, expiresAt };
};
