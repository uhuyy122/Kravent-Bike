import process from 'node:process';
import { readFileSync } from 'node:fs';
import { createPool, type Pool } from 'mysql2/promise';

let pool: Pool | undefined;

export const getTiDBPool = () => {
  if (pool) return pool;

  const { TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
  const missingSettings = Object.entries({
    TIDB_HOST,
    TIDB_USER,
    TIDB_PASSWORD,
    TIDB_DATABASE,
  })
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  if (missingSettings.length > 0) {
    throw new Error(`Konfigurasi TiDB belum lengkap: ${missingSettings.join(', ')}.`);
  }

  const port = Number(process.env.TIDB_PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('TIDB_PORT tidak valid.');
  }

  const caSetting = process.env.TIDB_SSL_CA?.replace(/\\n/g, '\n');
  let ca: string | undefined;
  if (caSetting) {
    if (caSetting.trimStart().startsWith('-----BEGIN CERTIFICATE-----')) {
      ca = caSetting;
    } else {
      try {
        ca = readFileSync(caSetting, 'utf8');
      } catch {
        throw new Error(
          'TIDB_SSL_CA bukan PEM yang valid dan file sertifikat tidak dapat dibaca. Di Vercel gunakan isi PEM, bukan path file lokal.'
        );
      }
    }
  }

  pool = createPool({
    host: TIDB_HOST,
    port,
    user: TIDB_USER,
    password: TIDB_PASSWORD,
    database: TIDB_DATABASE,
    ssl: {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
    },
    connectionLimit: 5,
    dateStrings: true,
    decimalNumbers: true,
    timezone: 'Z',
  });

  return pool;
};
