import {
  getAdminDb,
  getVerifiedUid,
  isOtpHashMatch,
  respondToMethodNotAllowed,
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
    const body = typeof request.body === 'object' && request.body !== null
      ? request.body as { phone?: unknown; code?: unknown }
      : {};
    if (
      typeof body.phone !== 'string' ||
      typeof body.code !== 'string' ||
      !/^\d{6}$/.test(body.code) ||
      body.phone.trim().length > 32
    ) {
      return response.status(400).json({ error: 'Nomor WhatsApp atau kode verifikasi tidak valid.' });
    }

    const phone = body.phone.trim();
    const uidRef = getAdminDb().collection('whatsappOtpChallenges').doc(uid);
    const verifiedPhoneRef = getAdminDb().collection('verifiedWhatsAppPhones').doc(uid);
    const now = Date.now();

    const result = await getAdminDb().runTransaction(async transaction => {
      const challenge = await transaction.get(uidRef);
      const data = challenge.data();
      if (
        !data ||
        data.phone !== phone ||
        !(data.expiresAt instanceof Date || typeof data.expiresAt?.toMillis === 'function') ||
        data.expiresAt.toMillis() <= now
      ) {
        return { status: 'expired' as const };
      }

      if (typeof data.attempts === 'number' && data.attempts >= 5) {
        transaction.delete(uidRef);
        return { status: 'locked' as const };
      }

      if (!isOtpHashMatch(String(data.codeHash || ''), uid, phone, body.code as string)) {
        const attempts = (typeof data.attempts === 'number' ? data.attempts : 0) + 1;
        if (attempts >= 5) {
          transaction.delete(uidRef);
          return { status: 'locked' as const };
        }
        transaction.update(uidRef, { attempts });
        return { status: 'invalid' as const };
      }

      transaction.set(verifiedPhoneRef, {
        phone,
        expiresAt: timestampFromMillis(now + 30 * 60_000),
      });
      transaction.delete(uidRef);
      return { status: 'verified' as const };
    });

    if (result.status !== 'verified') {
      const error = result.status === 'expired'
        ? 'Kode verifikasi salah atau sudah kedaluwarsa. Minta kode baru.'
        : result.status === 'locked'
          ? 'Terlalu banyak percobaan. Minta kode verifikasi baru.'
          : 'Kode verifikasi salah. Periksa kembali kode yang diterima.';
      return response.status(400).json({ error });
    }

    return response.status(200).json({ message: 'Nomor WhatsApp berhasil diverifikasi.' });
  } catch (error) {
    console.error('Gagal memverifikasi OTP WhatsApp:', error);
    const message = error instanceof Error ? error.message : 'Gagal memverifikasi kode.';
    return response.status(message.includes('Autentikasi') ? 401 : 500).json({
      error: message.includes('Autentikasi')
        ? message
        : 'Gagal memverifikasi kode. Periksa konfigurasi server.',
    });
  }
}
