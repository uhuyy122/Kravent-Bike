import { getSessionUid, issueOrRefreshSession } from '../../src/server/session.js';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

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
      error: message.startsWith('Konfigurasi TiDB belum lengkap:') ||
        message.startsWith('TIDB_SSL_CA bukan PEM yang valid')
        ? message
        : 'Gagal membuat sesi. Periksa koneksi TiDB dan log fungsi /api/auth/session di Vercel.',
    });
  }
}
