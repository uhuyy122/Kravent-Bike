import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface ApiRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

const getAdminApp = () => {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON belum dikonfigurasi.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  if (!databaseId) {
    throw new Error('FIRESTORE_DATABASE_ID belum dikonfigurasi.');
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  });
};

export const getAdminDb = () => {
  const app = getAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  if (!databaseId) throw new Error('FIRESTORE_DATABASE_ID belum dikonfigurasi.');
  return getFirestore(app, databaseId);
};

export const getVerifiedUid = async (request: ApiRequest): Promise<string> => {
  const authorization = request.headers.authorization;
  const token = (Array.isArray(authorization) ? authorization[0] : authorization)
    ?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Autentikasi Firebase dibutuhkan.');

  try {
    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    throw new Error('Autentikasi Firebase tidak valid.');
  }
};

export const getOtpHash = (uid: string, phone: string, code: string): string => {
  const secret = process.env.WHATSAPP_OTP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('WHATSAPP_OTP_SECRET harus dikonfigurasi minimal 32 karakter.');
  }
  return createHmac('sha256', secret).update(`${uid}:${phone}:${code}`).digest('hex');
};

export const isOtpHashMatch = (expectedHash: string, uid: string, phone: string, code: string): boolean => {
  const encoder = new TextEncoder();
  const actualHash = encoder.encode(getOtpHash(uid, phone, code));
  const expected = encoder.encode(expectedHash);
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
};

export const normalizeWhatsAppNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('62')
      ? digits
      : `62${digits}`;

  if (!/^628\d{8,11}$/.test(international)) {
    throw new Error('Masukkan nomor WhatsApp Indonesia yang valid.');
  }

  return international;
};

export const sendWhatsAppOtp = async (phone: string, code: string): Promise<void> => {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.META_WHATSAPP_GRAPH_API_VERSION;
  const templateName = process.env.META_WHATSAPP_OTP_TEMPLATE_NAME;
  const templateLanguage = process.env.META_WHATSAPP_OTP_TEMPLATE_LANGUAGE;
  if (
    !accessToken ||
    !phoneNumberId ||
    !/^v\d+\.\d+$/.test(apiVersion || '') ||
    !templateName ||
    !templateLanguage
  ) {
    throw new Error('Konfigurasi Meta WhatsApp Cloud API belum lengkap.');
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeWhatsAppNumber(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    console.error('WhatsApp Cloud API OTP send failed:', response.status);
    throw new Error('WhatsApp Cloud API menolak pengiriman kode verifikasi.');
  }
};

export const respondToMethodNotAllowed = (response: ApiResponse) =>
  response.status(405).json({ error: 'Metode request tidak didukung.' });

export const generateOtp = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const timestampFromMillis = (milliseconds: number) => Timestamp.fromMillis(milliseconds);
