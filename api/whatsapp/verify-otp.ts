import {
  getVerifiedUid,
  isOtpHashMatch,
  respondToMethodNotAllowed,
} from '../../src/server/whatsappOtp.js';
import { verifyWhatsAppOtpChallenge } from '../../src/server/whatsappOtpStore.js';

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
    const now = Date.now();
    const result = await verifyWhatsAppOtpChallenge(
      uid,
      phone,
      body.code,
      now,
      isOtpHashMatch
    );

    if (result !== 'verified') {
      const error = result === 'expired'
        ? 'Kode verifikasi salah atau sudah kedaluwarsa. Minta kode baru.'
        : result === 'locked'
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
