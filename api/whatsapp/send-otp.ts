import {
  generateOtp,
  getOtpHash,
  getVerifiedUid,
  normalizeWhatsAppNumber,
  respondToMethodNotAllowed,
  sendWhatsAppOtp,
} from '../../src/server/whatsappOtp.js';
import { createWhatsAppOtpChallenge } from '../../src/server/whatsappOtpStore.js';

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
    const code = generateOtp();
    const codeHash = getOtpHash(uid, phone.trim(), code);
    const rateLimitError = await createWhatsAppOtpChallenge({
      uid,
      phone: phone.trim(),
      normalizedPhone,
      codeHash,
      now,
    });

    if (rateLimitError) return response.status(429).json({ error: rateLimitError });

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
