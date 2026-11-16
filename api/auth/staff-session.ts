import { createHash, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getTiDBPool } from '../../src/server/tidb.js';
import {
  getSession,
  setSessionRole,
  type SessionRole,
} from '../../src/server/session.js';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

interface AttemptRow extends RowDataPacket {
  window_started_at_ms: number;
  attempts: number;
  locked_until_ms: number;
}

const getBearerToken = (request: ApiRequest): string | undefined => {
  const authorization = request.headers.authorization;
  const token = (Array.isArray(authorization) ? authorization[0] : authorization)
    ?.replace(/^Bearer\s+/i, '');
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
};

const getRequestIp = (request: ApiRequest): string => {
  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return 'unknown';
};

const isRateLimited = async (request: ApiRequest): Promise<boolean> => {
  const subjectHash = createHash('sha256').update(getRequestIp(request)).digest('hex');
  const [rows] = await getTiDBPool().execute<AttemptRow[]>(
    `SELECT window_started_at_ms, attempts, locked_until_ms
     FROM app_staff_pin_attempts
     WHERE subject_hash = ?
     LIMIT 1`,
    [subjectHash]
  );
  return Number(rows[0]?.locked_until_ms ?? 0) > Date.now();
};

const recordFailedAttempt = async (request: ApiRequest): Promise<boolean> => {
  const pool = getTiDBPool();
  const connection = await pool.getConnection();
  const now = Date.now();
  const subjectHash = createHash('sha256').update(getRequestIp(request)).digest('hex');
  const windowMs = 15 * 60_000;

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT IGNORE INTO app_staff_pin_attempts
       (subject_hash, window_started_at_ms, attempts, locked_until_ms)
       VALUES (?, ?, 0, 0)`,
      [subjectHash, now]
    );
    const [rows] = await connection.execute<AttemptRow[]>(
      `SELECT window_started_at_ms, attempts, locked_until_ms
       FROM app_staff_pin_attempts
       WHERE subject_hash = ?
       FOR UPDATE`,
      [subjectHash]
    );
    const attempt = rows[0];
    if (!attempt) throw new Error('Status percobaan PIN tidak dapat dibaca.');
    if (Number(attempt.locked_until_ms) > now) {
      await connection.rollback();
      return true;
    }

    const isExpired = now - Number(attempt.window_started_at_ms) >= windowMs;
    const attempts = isExpired ? 1 : Number(attempt.attempts) + 1;
    const lockedUntil = attempts >= 5 ? now + windowMs : 0;
    await connection.execute(
      `UPDATE app_staff_pin_attempts
       SET window_started_at_ms = ?, attempts = ?, locked_until_ms = ?
       WHERE subject_hash = ?`,
      [isExpired ? now : attempt.window_started_at_ms, attempts, lockedUntil, subjectHash]
    );
    await connection.commit();
    return lockedUntil > now;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const clearFailedAttempts = async (request: ApiRequest): Promise<void> => {
  const subjectHash = createHash('sha256').update(getRequestIp(request)).digest('hex');
  await getTiDBPool().execute(
    `UPDATE app_staff_pin_attempts
     SET attempts = 0, locked_until_ms = 0, window_started_at_ms = ?
     WHERE subject_hash = ?`,
    [Date.now(), subjectHash]
  );
};

const getRoleAndPin = (body: unknown): { role: Exclude<SessionRole, 'customer'>; pin: string } | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (
    (value.role !== 'admin' && value.role !== 'karyawan') ||
    typeof value.pin !== 'string' ||
    !/^\d{4}$/.test(value.pin)
  ) {
    return null;
  }
  return { role: value.role, pin: value.pin };
};

const pinsMatch = (provided: string, expected: string): boolean => {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Metode request tidak didukung.' });
  }

  try {
    const token = getBearerToken(request);
    const session = token ? await getSession(token) : null;
    if (!session) {
      return response.status(401).json({ error: 'Sesi database tidak valid.' });
    }

    if (request.method === 'DELETE') {
      await setSessionRole(session.uid, 'customer');
      return response.status(200).json({ role: 'customer' });
    }

    const credentials = getRoleAndPin(request.body);
    if (!credentials) {
      return response.status(400).json({ error: 'Role atau format PIN tidak valid.' });
    }

    const environmentKey = credentials.role === 'admin'
      ? 'ADMIN_ACCESS_PIN'
      : 'STAFF_ACCESS_PIN';
    const expectedPin = process.env[environmentKey];
    if (!expectedPin || !/^\d{4}$/.test(expectedPin)) {
      return response.status(503).json({
        error: `PIN akses belum dikonfigurasi dengan benar (${environmentKey}).`,
      });
    }

    if (await isRateLimited(request)) {
      return response.status(429).json({
        error: 'Terlalu banyak percobaan PIN. Coba lagi setelah 15 menit.',
      });
    }

    if (!pinsMatch(credentials.pin, expectedPin)) {
      const lockoutActive = await recordFailedAttempt(request);
      return response.status(lockoutActive ? 429 : 401).json({
        error: lockoutActive
          ? 'Terlalu banyak percobaan PIN. Coba lagi setelah 15 menit.'
          : 'PIN salah. Silakan coba lagi.',
      });
    }

    await clearFailedAttempts(request);
    await setSessionRole(session.uid, credentials.role);
    return response.status(200).json({ role: credentials.role });
  } catch (error) {
    console.error('Staff PIN verification failed:', error);
    return response.status(500).json({ error: 'Gagal memverifikasi akses staf.' });
  }
}
