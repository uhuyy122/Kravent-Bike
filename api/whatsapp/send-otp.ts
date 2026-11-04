import { createHash } from 'node:crypto';
import {
  generateOtp,
  getAdminDb,
  getOtpHash,
  getVerifiedUid,
  normalizeWhatsAppNumber,
  respondToMethodNotAllowed,
  sendWhatsAppOtp,
  timestampFromMillis,
} from '../../src/server/whatsappOtp';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return respondToMethodNotAllowed(response);

  try {
    const uid = await getVerifiedUid(request);
    const phone = typeof request.body === 'object' && request.body !== null
      ? (request.body as { phone?: unknown }).phone
      : undefined;
    if (typeof phone !== 'string' || phone.trim().length > 32) {
      return response.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
    }

    const normalizedPhone = normalizeWhatsAppNumber(phone);
    const now = Date.now();
    const db = getAdminDb();
    const challengeRef = db.collection('whatsappOtpChallenges').doc(uid);
    const phoneRateLimitRef = db
      .collection('whatsappOtpRateLimits')
      .doc(createHash('sha256').update(normalizedPhone).digest('hex'));
    const code = generateOtp();
    const codeHash = getOtpHash(uid, phone.trim(), code);

    const result = await db.runTransaction(async transaction => {
      const challenge = await transaction.get(challengeRef);
      const phoneRateLimit = await transaction.get(phoneRateLimitRef);
      const existing = challenge.data();
      const lastSentAt = typeof existing?.lastSentAt === 'number' ? existing.lastSentAt : 0;
      if (now - lastSentAt < 60_000) {
        return { error: 'Tunggu satu menit sebelum meminta kode baru.' };
      }

      const phoneRateLimitData = phoneRateLimit.data();
      const phoneWindowStartedAt = typeof phoneRateLimitData?.windowStartedAt === 'number'
        ? phoneRateLimitData.windowStartedAt
        : now;
      const phoneSendCount = now - phoneWindowStartedAt >= 60 * 60_000
        ? 0
        : typeof phoneRateLimitData?.sendCount === 'number' ? phoneRateLimitData.sendCount : 0;
      if (phoneSendCount >= 3) {
        return { error: 'Batas pengiriman kode ke nomor ini tercapai. Coba kembali satu jam lagi.' };
      }

      const userSendCount = typeof existing?.windowStartedAt === 'number' &&
        now - existing.windowStartedAt < 60 * 60_000 &&
        typeof existing.sendCount === 'number'
        ? existing.sendCount
        : 0;
      if (userSendCount >= 5) {
        return { error: 'Batas pengiriman kode tercapai. Coba kembali satu jam lagi.' };
      }

      transaction.set(challengeRef, {
        phone: phone.trim(),
        normalizedPhone,
        codeHash,
        expiresAt: timestampFromMillis(now + 5 * 60_000),
        lastSentAt: now,
        windowStartedAt: userSendCount === 0 ? now : existing?.windowStartedAt,
        sendCount: userSendCount + 1,
        attempts: 0,
      });
      transaction.set(phoneRateLimitRef, {
        windowStartedAt: phoneSendCount === 0 ? now : phoneWindowStartedAt,
        sendCount: phoneSendCount + 1,
        lastSentAt: now,
      });
      return { error: null };
    });

    if (result.error) return response.status(429).json({ error: result.error });

    await sendWhatsAppOtp(phone.trim(), code);
    return response.status(200).json({ message: 'Kode verifikasi dikirim. Kode berlaku selama 5 menit.' });
  } catch (error) {
    console.error('Gagal mengirim OTP WhatsApp:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengirim kode verifikasi.';
    const statusCode = message.includes('Autentikasi') ? 401
      : message.includes('nomor WhatsApp') ? 400
        : 500;
    return response.status(statusCode).json({
      error: statusCode === 500 ? 'Gagal mengirim kode verifikasi. Periksa konfigurasi server WhatsApp.' : message,
    });
  }
}
