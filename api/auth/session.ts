import { getSessionUid, issueOrRefreshSession } from '../../src/server/session.js';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

const getSafeErrorMessage = (message: string, code?: string) => {
  if (message.startsWith('Konfigurasi TiDB belum lengkap:') ||
    message.startsWith('TIDB_SSL_CA bukan PEM yang valid')) {
    return message;
  }

  switch (code) {
    case 'ER_ACCESS_DENIED_ERROR':
      return 'TiDB menolak akses. Periksa TIDB_USER, TIDB_PASSWORD, dan hak akses pengguna database.';
    case 'ER_BAD_DB_ERROR':
      return 'Database TiDB tidak ditemukan. Periksa TIDB_DATABASE.';
    case 'ER_NO_SUCH_TABLE':
      return 'Tabel aplikasi belum tersedia. Jalankan database/tidb_schema.sql pada database TiDB.';
    case 'ENOTFOUND':
      return 'Host TiDB tidak ditemukan. Periksa TIDB_HOST.';
    case 'ETIMEDOUT':
    case 'ECONNREFUSED':
    case 'EHOSTUNREACH':
    case 'ECONNRESET':
      return 'Vercel tidak dapat menjangkau TiDB. Periksa alamat dan port, serta IP Access List TiDB Cloud.';
    case 'CERT_HAS_EXPIRED':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return 'Verifikasi TLS TiDB gagal. Periksa TIDB_SSL_CA; di Vercel gunakan isi PEM, bukan path file.';
    default:
      return code && /^[A-Z0-9_]+$/.test(code)
        ? `Gagal terhubung ke TiDB (kode ${code}).`
        : 'Gagal terhubung ke TiDB. Periksa konfigurasi dan akses jaringan.';
  }
};

const getBearerToken = (request: ApiRequest): string | undefined => {
  const authorization = request.headers.authorization;
  const value = (Array.isArray(authorization) ? authorization[0] : authorization)
    ?.replace(/^Bearer\s+/i, '');
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Metode request tidak didukung.' });
  }

  try {
    const currentToken = getBearerToken(request);
    const uid = currentToken ? await getSessionUid(currentToken) : null;
    const session = await issueOrRefreshSession(uid, currentToken);
    return response.status(200).json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : undefined;
    console.error('Gagal membuat sesi TiDB:', { code, message });
    return response.status(500).json({
      error: getSafeErrorMessage(message, code),
    });
  }
}
