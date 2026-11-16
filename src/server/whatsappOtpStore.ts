import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getTiDBPool } from './tidb.js';

interface RateLimitRow extends RowDataPacket {
  subject_hash: string;
  window_started_at_ms: number | string;
  send_count: number | string;
  last_sent_at_ms: number | string;
}

interface ChallengeRow extends RowDataPacket {
  phone: string;
  code_hash: string;
  expires_at_ms: number | string;
  attempts: number | string;
}

const hourInMilliseconds = 60 * 60_000;

const hashSubject = (value: string) => createHash('sha256').update(value).digest('hex');

export const createWhatsAppOtpChallenge = async ({
  uid,
  phone,
  normalizedPhone,
  codeHash,
  now,
}: {
  uid: string;
  phone: string;
  normalizedPhone: string;
  codeHash: string;
  now: number;
}): Promise<string | null> => {
  const userHash = hashSubject(`user:${uid}`);
  const phoneHash = hashSubject(`phone:${normalizedPhone}`);
  const connection = await getTiDBPool().getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await connection.execute(
      'DELETE FROM whatsapp_otp_challenges WHERE expires_at_ms <= ?',
      [now]
    );
    await connection.execute(
      'DELETE FROM whatsapp_verified_phones WHERE expires_at_ms <= ?',
      [now]
    );
    await connection.execute(
      'DELETE FROM whatsapp_otp_rate_limits WHERE window_started_at_ms <= ?',
      [now - hourInMilliseconds]
    );
    await connection.execute(
      `INSERT INTO whatsapp_otp_rate_limits (subject_hash) VALUES (?), (?)
       ON DUPLICATE KEY UPDATE subject_hash = VALUES(subject_hash)`,
      [userHash, phoneHash]
    );

    const [rows] = await connection.execute<RateLimitRow[]>(
      `SELECT subject_hash, window_started_at_ms, send_count, last_sent_at_ms
       FROM whatsapp_otp_rate_limits
       WHERE subject_hash IN (?, ?)
       ORDER BY subject_hash
       FOR UPDATE`,
      [userHash, phoneHash]
    );
    const limits = new Map(rows.map(row => [row.subject_hash, row]));
    const userLimit = limits.get(userHash);
    const phoneLimit = limits.get(phoneHash);
    if (!userLimit || !phoneLimit) {
      throw new Error('Data batas pengiriman OTP tidak ditemukan.');
    }

    const userWindowStartedAt = Number(userLimit.window_started_at_ms);
    const userWindowActive = userWindowStartedAt > 0 &&
      now - userWindowStartedAt < hourInMilliseconds;
    const userSendCount = userWindowActive ? Number(userLimit.send_count) : 0;
    const phoneWindowStartedAt = Number(phoneLimit.window_started_at_ms);
    const phoneWindowActive = phoneWindowStartedAt > 0 &&
      now - phoneWindowStartedAt < hourInMilliseconds;
    const phoneSendCount = phoneWindowActive ? Number(phoneLimit.send_count) : 0;

    const lastSentAt = Number(userLimit.last_sent_at_ms);
    const error = now - lastSentAt < 60_000
      ? 'Tunggu satu menit sebelum meminta kode baru.'
      : phoneSendCount >= 3
        ? 'Batas pengiriman kode ke nomor ini tercapai. Coba kembali satu jam lagi.'
        : userSendCount >= 5
          ? 'Batas pengiriman kode tercapai. Coba kembali satu jam lagi.'
          : null;

    if (!error) {
      await connection.execute(
        `UPDATE whatsapp_otp_rate_limits
         SET window_started_at_ms = ?, send_count = ?, last_sent_at_ms = ?
         WHERE subject_hash = ?`,
        [userSendCount === 0 ? now : userWindowStartedAt, userSendCount + 1, now, userHash]
      );
      await connection.execute(
        `UPDATE whatsapp_otp_rate_limits
         SET window_started_at_ms = ?, send_count = ?, last_sent_at_ms = ?
         WHERE subject_hash = ?`,
        [phoneSendCount === 0 ? now : phoneWindowStartedAt, phoneSendCount + 1, now, phoneHash]
      );
      await connection.execute(
        `INSERT INTO whatsapp_otp_challenges
           (uid, phone, code_hash, expires_at_ms, attempts)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           phone = VALUES(phone),
           code_hash = VALUES(code_hash),
           expires_at_ms = VALUES(expires_at_ms),
           attempts = 0`,
        [uid, phone, codeHash, now + 5 * 60_000]
      );
    }

    await connection.commit();
    transactionStarted = false;
    return error;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Gagal membatalkan transaksi pembuatan OTP:', rollbackError);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const verifyWhatsAppOtpChallenge = async (
  uid: string,
  phone: string,
  code: string,
  now: number,
  matchesCode: (codeHash: string, uid: string, phone: string, code: string) => boolean
): Promise<'expired' | 'locked' | 'invalid' | 'verified'> => {
  const connection = await getTiDBPool().getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await connection.execute(
      'DELETE FROM whatsapp_verified_phones WHERE expires_at_ms <= ?',
      [now]
    );
    const [rows] = await connection.execute<ChallengeRow[]>(
      `SELECT phone, code_hash, expires_at_ms, attempts
       FROM whatsapp_otp_challenges
       WHERE uid = ?
       FOR UPDATE`,
      [uid]
    );
    const challenge = rows[0];
    let result: 'expired' | 'locked' | 'invalid' | 'verified';

    if (!challenge || challenge.phone !== phone || Number(challenge.expires_at_ms) <= now) {
      if (challenge && Number(challenge.expires_at_ms) <= now) {
        await connection.execute('DELETE FROM whatsapp_otp_challenges WHERE uid = ?', [uid]);
      }
      result = 'expired';
    } else if (Number(challenge.attempts) >= 5) {
      await connection.execute('DELETE FROM whatsapp_otp_challenges WHERE uid = ?', [uid]);
      result = 'locked';
    } else if (!matchesCode(challenge.code_hash, uid, phone, code)) {
      const attempts = Number(challenge.attempts) + 1;
      if (attempts >= 5) {
        await connection.execute('DELETE FROM whatsapp_otp_challenges WHERE uid = ?', [uid]);
        result = 'locked';
      } else {
        await connection.execute(
          'UPDATE whatsapp_otp_challenges SET attempts = ? WHERE uid = ?',
          [attempts, uid]
        );
        result = 'invalid';
      }
    } else {
      await connection.execute(
        `INSERT INTO whatsapp_verified_phones (uid, phone, expires_at_ms)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE phone = VALUES(phone), expires_at_ms = VALUES(expires_at_ms)`,
        [uid, phone, now + 30 * 60_000]
      );
      await connection.execute('DELETE FROM whatsapp_otp_challenges WHERE uid = ?', [uid]);
      result = 'verified';
    }

    await connection.commit();
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Gagal membatalkan transaksi verifikasi OTP:', rollbackError);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const isWhatsAppPhoneVerified = async (
  uid: string,
  phone: unknown
): Promise<boolean> => {
  if (typeof phone !== 'string') return false;
  const [rows] = await getTiDBPool().execute<RowDataPacket[]>(
    `SELECT uid
     FROM whatsapp_verified_phones
     WHERE uid = ? AND phone = ? AND expires_at_ms > ?
     LIMIT 1`,
    [uid, phone, Date.now()]
  );
  return rows.length > 0;
};
