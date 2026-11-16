import { getVerifiedSession } from '../src/server/session.js';
import type { SessionRole } from '../src/server/session.js';
import { getTiDBPool } from '../src/server/tidb.js';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

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

const canManageTable = (role: SessionRole, table: TableName) =>
  table === 'bookings' ? role === 'admin' || role === 'karyawan' : role === 'admin';

const getPublicBooking = (row: Record<string, unknown>) => fromRow({
  id: row.id,
  bike_id: row.bike_id,
  start_date: row.start_date,
  start_time: row.start_time,
  end_date: row.end_date,
  end_time: row.end_time,
  duration_type: row.duration_type,
  booking_session: row.booking_session,
  status: row.status,
});

const buildInsert = (
  table: TableName,
  id: string,
  values: Record<string, unknown>,
  upsert = true
) => {
  const row: Record<string, unknown> = { id, ...values };
  const fields = Object.keys(row);
  const updates = fields.filter(field => field !== 'id');
  const updateClause = upsert && updates.length
    ? ` ON DUPLICATE KEY UPDATE ${updates.map(field => `\`${field}\` = VALUES(\`${field}\`)`).join(', ')}`
    : '';
  return {
    query: `INSERT INTO \`${table}\` (${fields.map(field => `\`${field}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})${updateClause}`,
    values: fields.map(field => toSqlParameter(row[field])),
  };
};

const hasScheduleConflict = async (
  connection: PoolConnection,
  bikeId: string,
  startDate: string,
  startTime: string,
  role: SessionRole,
  excludeBookingId?: string
): Promise<boolean> => {
  const sessionRange = startTime < '13:00'
    ? "start_time < '13:00'"
    : "start_time >= '13:00'";
  const excludeClause = excludeBookingId ? 'AND id <> ?' : '';
  const roleClause = role === 'admin'
    ? "AND (status IN ('aktif', 'sedang di luar') OR start_time <= ?)"
    : '';
  const parameters: SqlParameter[] = [bikeId, startDate];
  if (excludeBookingId) parameters.push(excludeBookingId);
  if (role === 'admin') parameters.push(startTime);
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT id
     FROM bookings
     WHERE bike_id = ?
       AND start_date = ?
       AND status NOT IN ('dibatalkan', 'selesai')
       AND ${sessionRange}
       ${excludeClause}
       ${roleClause}
     LIMIT 1`,
    parameters
  );
  return rows.length > 0;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const session = await getVerifiedSession(request);
    const { role } = session;
    const url = new URL(request.url || '/api/data', 'http://localhost');
    const table = getTable(url.searchParams.get('collection'));
    const idParam = url.searchParams.get('id');
    const pool = getTiDBPool();

    if (request.method === 'GET') {
      if (role !== 'admin' && (table === 'expenses' || table === 'financial_settings')) {
        return response.status(403).json({ error: 'Akses data keuangan hanya tersedia untuk admin.' });
      }
      if (idParam) {
        const select = role === 'customer' && table === 'bookings'
          ? 'SELECT id, bike_id, start_date, start_time, end_date, end_time, duration_type, booking_session, status'
          : 'SELECT *';
        const [rows] = await pool.execute(`${select} FROM \`${table}\` WHERE id = ? LIMIT 1`, [getId(idParam)]);
        const row = (rows as Record<string, unknown>[])[0];
        const item = !row ? null
          : role === 'customer' && table === 'bookings' ? getPublicBooking(row)
            : fromRow(row);
        return response.status(200).json({ item });
      }
      const select = role === 'customer' && table === 'bookings'
        ? 'SELECT id, bike_id, start_date, start_time, end_date, end_time, duration_type, booking_session, status'
        : 'SELECT *';
      const [rows] = await pool.query(`${select} FROM \`${table}\``);
      const items = (rows as Record<string, unknown>[]).map(row =>
        role === 'customer' && table === 'bookings' ? getPublicBooking(row) : fromRow(row)
      );
      return response.status(200).json({ items });
    }

    if (request.method === 'POST') {
      if (!canManageTable(role, table) && table !== 'bookings') {
        return response.status(403).json({ error: 'Akses untuk mengubah data ini ditolak.' });
      }
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
        if (existing && role === 'customer') {
          return response.status(403).json({ error: 'Pelanggan tidak dapat mengubah booking yang sudah dibuat.' });
        }
        if (!existing && role === 'customer') {
          values.status = 'pending';
          for (const column of [
            'returned_at', 'actual_start_date', 'actual_start_time', 'handover_by',
            'payment_notes', 'fee_payment_method', 'swapped_from_bike_id',
            'swapped_from_bike_name', 'swapped_at', 'actual_return_date',
            'actual_return_time', 'late_minutes', 'late_extra_hours', 'late_fee',
            'final_total_price', 'return_notes', 'approved_at', 'approved_by',
            'rejection_reason',
          ]) {
            values[column] = null;
          }
        }

        if (!existing) {
          const bikeId = values.bike_id;
          const startDate = values.start_date;
          const startTime = values.start_time;
          if (
            typeof bikeId !== 'string' ||
            typeof startDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
            typeof startTime !== 'string' ||
            !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)
          ) {
            return response.status(400).json({ error: 'Jadwal booking tidak valid.' });
          }
          if (startTime < '06:00' || startTime > '21:00') {
            return response.status(409).json({ error: 'Jam mulai booking harus berada pada pukul 06:00 sampai 21:00 WIB.' });
          }

          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            const [bikeRows] = await connection.execute(
              'SELECT id, status FROM bikes WHERE id = ? FOR UPDATE',
              [bikeId]
            );
            const bike = (bikeRows as Record<string, unknown>[])[0];
            if (!bike) {
              await connection.rollback();
              return response.status(404).json({ error: 'Sepeda tidak ditemukan.' });
            }
            if (bike.status === 'maintenance') {
              await connection.rollback();
              return response.status(409).json({ error: 'Sepeda sedang dalam perawatan dan tidak dapat dipesan.' });
            }

            if (await hasScheduleConflict(connection, bikeId, startDate, startTime, role)) {
              await connection.rollback();
              return response.status(409).json({
                error: 'Sepeda sudah memiliki booking pada sesi waktu tersebut.',
              });
            }

            const insert = buildInsert(table, id, values, false);
            await connection.execute(insert.query, insert.values);
            if (
              values.status === 'booking' ||
              values.status === 'sedang di luar' ||
              values.status === 'aktif'
            ) {
              await connection.execute(
                `UPDATE bikes
                 SET status = 'disewa', total_rented_count = total_rented_count + 1
                 WHERE id = ?`,
                [bikeId]
              );
            }
            await connection.commit();
            return response.status(200).json({ ok: true });
          } catch (error) {
            await connection.rollback();
            throw error;
          } finally {
            connection.release();
          }
        }
      }

      const insert = buildInsert(table, id, values);
      await pool.execute(
        insert.query,
        insert.values
      );
      return response.status(200).json({ ok: true });
    }

    if (request.method === 'PATCH') {
      if (!canManageTable(role, table)) {
        return response.status(403).json({ error: 'Akses untuk mengubah data ini ditolak.' });
      }
      if (!idParam) throw new Error('ID data wajib diisi.');
      const id = getId(idParam);
      const values = getRecord(getBody(request.body).data, table);
      const entries = Object.entries(values);
      if (!entries.length) return response.status(400).json({ error: 'Tidak ada kolom untuk diperbarui.' });
      if (
        table === 'bookings' &&
        ('bike_id' in values || 'start_date' in values || 'start_time' in values)
      ) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const [currentRows] = await connection.execute<RowDataPacket[]>(
            `SELECT bike_id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
                    CAST(start_time AS CHAR) AS start_time
             FROM bookings
             WHERE id = ?
             FOR UPDATE`,
            [id]
          );
          const current = currentRows[0];
          if (!current) {
            await connection.rollback();
            return response.status(404).json({ error: 'Booking tidak ditemukan.' });
          }
          const bikeId = typeof values.bike_id === 'string' ? values.bike_id : String(current.bike_id);
          const startDate = typeof values.start_date === 'string' ? values.start_date : String(current.start_date);
          const startTime = typeof values.start_time === 'string' ? values.start_time : String(current.start_time);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
            !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)
          ) {
            await connection.rollback();
            return response.status(400).json({ error: 'Jadwal booking tidak valid.' });
          }
          const [bikeRows] = await connection.execute<RowDataPacket[]>(
            'SELECT id, status FROM bikes WHERE id = ? FOR UPDATE',
            [bikeId]
          );
          const bike = bikeRows[0] as (RowDataPacket & { status: string }) | undefined;
          if (!bike) {
            await connection.rollback();
            return response.status(404).json({ error: 'Sepeda tidak ditemukan.' });
          }
          if (bike.status === 'maintenance') {
            await connection.rollback();
            return response.status(409).json({ error: 'Sepeda sedang dalam perawatan dan tidak dapat dipesan.' });
          }
          if (startTime < '06:00' || startTime > '21:00') {
            await connection.rollback();
            return response.status(409).json({ error: 'Jam mulai booking harus berada pada pukul 06:00 sampai 21:00 WIB.' });
          }
          if (await hasScheduleConflict(connection, bikeId, startDate, startTime, role, id)) {
            await connection.rollback();
            return response.status(409).json({
              error: 'Sepeda sudah memiliki booking pada sesi waktu tersebut.',
            });
          }
          await connection.execute(
            `UPDATE bookings
             SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')}
             WHERE id = ?`,
            [...entries.map(([, value]) => toSqlParameter(value)), id]
          );
          await connection.commit();
          return response.status(200).json({ ok: true });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }
      await pool.execute(
        `UPDATE \`${table}\` SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')} WHERE id = ?`,
        [...entries.map(([, value]) => toSqlParameter(value)), id]
      );
      return response.status(200).json({ ok: true });
    }

    if (request.method === 'DELETE') {
      if (!canManageTable(role, table)) {
        return response.status(403).json({ error: 'Akses untuk menghapus data ini ditolak.' });
      }
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
