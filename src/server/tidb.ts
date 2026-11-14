import process from 'node:process';
import { createPool, type Pool } from 'mysql2/promise';

let pool: Pool | undefined;

export const getTiDBPool = () => {
  if (pool) return pool;

  const { TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
  if (!TIDB_HOST || !TIDB_USER || !TIDB_PASSWORD || !TIDB_DATABASE) {
    throw new Error('Konfigurasi koneksi TiDB server belum lengkap.');
  }

  const port = Number(process.env.TIDB_PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('TIDB_PORT tidak valid.');
  }

  pool = createPool({
    host: TIDB_HOST,
    port,
    user: TIDB_USER,
    password: TIDB_PASSWORD,
    database: TIDB_DATABASE,
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.TIDB_SSL_CA ? { ca: process.env.TIDB_SSL_CA.replace(/\\n/g, '\n') } : {}),
    },
    connectionLimit: 5,
    dateStrings: true,
    decimalNumbers: true,
    timezone: 'Z',
  });

  return pool;
};
