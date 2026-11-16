import { getVerifiedUid } from '../src/server/whatsappOtp.js';
import { getTiDBPool } from '../src/server/tidb.js';
import { isWhatsAppPhoneVerified } from '../src/server/whatsappOtpStore.js';

type SqlParameter = string | number | bigint | boolean | Date | Buffer | Uint8Array | null;

type TableName = 'bikes' | 'bookings' | 'expenses' | 'financial_settings';

interface ApiRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
}

const columns: Record<TableName, Set<string>> = {
  bikes: new Set([
    'id', 'name', 'brand', 'category', 'frame_size', 'color', 'price_per_hour',
    'price_per_day', 'image_url', 'description', 'gear_system', 'status',
    'license_number', 'total_rented_count', 'deposit_required',
  ]),
  bookings: new Set([
    'id', 'booking_code', 'bike_id', 'bike_name', 'bike_image', 'customer_name',
    'customer_phone', 'customer_email', 'id_card_number', 'start_date', 'start_time',
    'end_date', 'end_time', 'duration_type', 'duration_value', 'booking_session',
    'total_price', 'deposit_amount', 'status', 'payment_method', 'payment_status',
    'notes', 'created_at', 'returned_at', 'actual_start_date', 'actual_start_time',
    'handover_by', 'payment_notes', 'fee_payment_method', 'swapped_from_bike_id',
    'swapped_from_bike_name', 'swapped_at', 'actual_return_date', 'actual_return_time',
    'late_minutes', 'late_extra_hours', 'late_fee', 'final_total_price', 'return_notes',
    'discount_percent', 'discount_nominal', 'group_booking_code', 'group_item_index',
    'group_item_total', 'addons', 'addon_total_cost', 'approved_at', 'approved_by',
    'rejection_reason',
  ]),
  expenses: new Set([
    'id', 'title', 'category', 'amount', 'expense_date', 'description', 'bike_id',
    'receipt_proof',
  ]),
  financial_settings: new Set([
    'id', 'monthly_capital_by_month', 'partner1_name', 'partner1_percentage',
    'partner2_name', 'partner2_percentage', 'maintenance_budget_percentage',
    'maintenance_budget_nominal', 'maintenance_mode', 'content_budget_amount',
    'content_budget_percentage', 'operational_budget_percentage', 'calculation_mode',
  ]),
};

const jsonColumns = new Set(['addons', 'monthly_capital_by_month']);
const datetimeColumns = new Set([
  'created_at', 'returned_at', 'swapped_at', 'approved_at',
]);
const dateColumns = new Set([
  'start_date', 'end_date', 'actual_start_date', 'actual_return_date', 'expense_date',
]);

const toColumn = (key: string) => {
  if (key === 'date') return 'expense_date';
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const normalizeValue = (column: string, value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (jsonColumns.has(column)) return JSON.stringify(value);
  if (datetimeColumns.has(column) && typeof value === 'string') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error(`Format tanggal ${column} tidak valid.`);
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
  if (dateColumns.has(column) && typeof value === 'string') return value.slice(0, 10);
  return value;
};

const toSqlParameter = (value: unknown): SqlParameter => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  throw new Error('Tipe nilai kolom tidak didukung.');
};

const fromRow = (row: Record<string, unknown>) => Object.fromEntries(
  Object.entries(row).map(([column, rawValue]) => {
    let value = rawValue;
    if (jsonColumns.has(column) && typeof value === 'string') value = JSON.parse(value);
    if (datetimeColumns.has(column) && typeof value === 'string') {
      value = `${value.replace(' ', 'T')}Z`;
    }
    return [column === 'expense_date' ? 'date' : toCamel(column), value];
  })
);

const getTable = (value: string | null): TableName => {
  if (value === 'bikes' || value === 'bookings' || value === 'expenses' || value === 'financial_settings') {
    return value;
  }
  throw new Error('Nama tabel tidak diizinkan.');
};

const getBody = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('Body request tidak valid.');
  }
  return body as Record<string, unknown>;
};

const getId = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new Error('ID data tidak valid.');
  }
  return value;
};

const getRecord = (value: unknown, table: TableName) => {
  const record = getBody(value);
  const normalized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    const column = toColumn(key);
    if (!columns[table].has(column) || column === 'id') {
      if (column === 'id') continue;
      throw new Error(`Kolom ${key} tidak diizinkan.`);
    }
    normalized[column] = normalizeValue(column, val);
  }
  return normalized;
};

const nullableColumns: Record<TableName, string[]> = {
  bikes: [],
  bookings: [
    'customer_email', 'id_card_number', 'duration_type', 'duration_value', 'booking_session',
    'notes', 'returned_at', 'actual_start_date', 'actual_start_time', 'handover_by',
    'payment_notes', 'fee_payment_method', 'swapped_from_bike_id', 'swapped_from_bike_name',
    'swapped_at', 'actual_return_date', 'actual_return_time', 'late_minutes',
    'late_extra_hours', 'late_fee', 'final_total_price', 'return_notes', 'discount_percent',
    'discount_nominal', 'group_booking_code', 'group_item_index', 'group_item_total',
    'addons', 'addon_total_cost', 'approved_at', 'approved_by', 'rejection_reason',
  ],
  expenses: ['description', 'bike_id', 'receipt_proof'],
  financial_settings: [
    'monthly_capital_by_month', 'maintenance_budget_nominal', 'maintenance_mode',
    'content_budget_percentage',
  ],
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const uid = await getVerifiedUid(request);
    const url = new URL(request.url || '/api/data', 'http://localhost');
    const table = getTable(url.searchParams.get('collection'));
    const idParam = url.searchParams.get('id');
    const pool = getTiDBPool();

    if (request.method === 'GET') {
      if (idParam) {
        const [rows] = await pool.execute(
          `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
          [getId(idParam)]
        );
        const row = (rows as Record<string, unknown>[])[0];
        return response.status(200).json({ item: row ? fromRow(row) : null });
      }
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      return response.status(200).json({ items: (rows as Record<string, unknown>[]).map(fromRow) });
    }

    if (request.method === 'POST') {
      const body = getBody(request.body);
      const id = getId(body.id);
      const values = getRecord(body.data, table);
      if (body.merge !== true) {
        nullableColumns[table].forEach(column => {
          if (!(column in values)) values[column] = null;
        });
      }
      if (table === 'bookings') {
        const [existingRows] = await pool.execute(`SELECT id, customer_phone FROM bookings WHERE id = ? LIMIT 1`, [id]);
        const existing = (existingRows as Record<string, unknown>[])[0];
        const phone = values.customer_phone ?? existing?.customer_phone;
        if ((!existing || values.customer_phone !== undefined && values.customer_phone !== existing.customer_phone) &&
          !await isWhatsAppPhoneVerified(uid, phone)) {
          return response.status(403).json({ error: 'Verifikasi WhatsApp diperlukan sebelum menyimpan booking.' });
        }
      }

      const entries = Object.entries(values);
      const row: Record<string, unknown> = { id, ...Object.fromEntries(entries) };
      const fields = Object.keys(row);
      const updates = fields.filter(field => field !== 'id');
      const updateClause = updates.length
        ? ` ON DUPLICATE KEY UPDATE ${updates.map(field => `\`${field}\` = VALUES(\`${field}\`)`).join(', ')}`
        : '';
      await pool.execute(
        `INSERT INTO \`${table}\` (${fields.map(field => `\`${field}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})${updateClause}`,
        fields.map(field => toSqlParameter(row[field]))
      );
      return response.status(200).json({ ok: true });
    }

    if (request.method === 'PATCH') {
      if (!idParam) throw new Error('ID data wajib diisi.');
      const id = getId(idParam);
      const values = getRecord(getBody(request.body).data, table);
      if (table === 'bookings' && values.customer_phone !== undefined) {
        const [rows] = await pool.execute(`SELECT customer_phone FROM bookings WHERE id = ? LIMIT 1`, [id]);
        const existing = (rows as Record<string, unknown>[])[0];
        if (existing && values.customer_phone !== existing.customer_phone &&
          !await isWhatsAppPhoneVerified(uid, values.customer_phone)) {
          return response.status(403).json({ error: 'Verifikasi WhatsApp diperlukan untuk mengganti nomor booking.' });
        }
      }
      const entries = Object.entries(values);
      if (!entries.length) return response.status(400).json({ error: 'Tidak ada kolom untuk diperbarui.' });
      await pool.execute(
        `UPDATE \`${table}\` SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')} WHERE id = ?`,
        [...entries.map(([, value]) => toSqlParameter(value)), id]
      );
      return response.status(200).json({ ok: true });
    }

    if (request.method === 'DELETE') {
      if (!idParam) throw new Error('ID data wajib diisi.');
      await pool.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [getId(idParam)]);
      return response.status(200).json({ ok: true });
    }

    return response.status(405).json({ error: 'Metode request tidak didukung.' });
  } catch (error) {
    console.error('TiDB API request failed:', error);
    const message = error instanceof Error ? error.message : 'Kesalahan server.';
    const statusCode = message.includes('Autentikasi') ? 401
      : message.includes('tidak diizinkan') || message.includes('tidak valid') || message.includes('wajib') ? 400
        : 500;
    return response.status(statusCode).json({
      error: statusCode === 500 ? 'Gagal mengakses database. Periksa konfigurasi server.' : message,
    });
  }
}
