import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { escape as escapeSql, type SqlValue } from 'mysql2';

const tables = ['bikes', 'bookings', 'expenses', 'financial_settings'] as const;
type TableName = (typeof tables)[number];

const allowedColumns: Record<TableName, Set<string>> = {
  bikes: new Set([
    'name', 'brand', 'category', 'frame_size', 'color', 'price_per_hour',
    'price_per_day', 'image_url', 'description', 'gear_system', 'status',
    'license_number', 'total_rented_count', 'deposit_required',
  ]),
  bookings: new Set([
    'booking_code', 'bike_id', 'bike_name', 'bike_image', 'customer_name',
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
    'title', 'category', 'amount', 'expense_date', 'description', 'bike_id',
    'receipt_proof',
  ]),
  financial_settings: new Set([
    'monthly_capital_by_month', 'partner1_name', 'partner1_percentage',
    'partner2_name', 'partner2_percentage', 'maintenance_budget_percentage',
    'maintenance_budget_nominal', 'maintenance_mode', 'content_budget_amount',
    'content_budget_percentage', 'operational_budget_percentage', 'calculation_mode',
  ]),
};

const jsonColumns = new Set(['addons', 'monthly_capital_by_month']);
const datetimeColumns = new Set(['created_at', 'returned_at', 'swapped_at', 'approved_at']);
const dateColumns = new Set([
  'start_date', 'end_date', 'actual_start_date', 'actual_return_date', 'expense_date',
]);

const toSqlValue = (value: unknown): SqlValue => {
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
  throw new Error('Nilai kolom tidak dapat diekspor sebagai SQL.');
};

const toColumn = (key: string) => {
  if (key === 'date') return 'expense_date';
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const normalizeValue = (column: string, rawValue: unknown) => {
  let value = rawValue;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    value = value.toDate();
  }
  if (value instanceof Date) {
    return dateColumns.has(column)
      ? value.toISOString().slice(0, 10)
      : value.toISOString().replace('T', ' ').replace('Z', '');
  }
  if (jsonColumns.has(column) && value !== null && typeof value === 'object') {
    value = JSON.stringify(value);
  } else if (typeof value === 'boolean') {
    value = value ? 1 : 0;
  } else if (typeof value === 'object' && value !== null) {
    throw new Error(`Kolom ${column} berisi tipe data yang tidak didukung.`);
  }
  if (datetimeColumns.has(column) && typeof value === 'string') {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Format waktu pada kolom ${column} tidak valid.`);
    }
    return parsedDate.toISOString().replace('T', ' ').replace('Z', '');
  }
  if (dateColumns.has(column) && typeof value === 'string') return value.slice(0, 10);
  return value;
};

const getServiceAccount = () => {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  if (!serviceAccountJson || !databaseId) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON dan FIRESTORE_DATABASE_ID wajib diisi di .env.');
  }
  const serviceAccount = JSON.parse(serviceAccountJson) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Service Account Firebase tidak memiliki project_id, client_email, atau private_key.');
  }
  return { serviceAccount, databaseId };
};

const insertStatement = (table: TableName, row: Record<string, unknown>) => {
  const fields = Object.keys(row);
  const updates = fields.filter(field => field !== 'id');
  const updateClause = updates.length
    ? ` ON DUPLICATE KEY UPDATE ${updates.map(field => `\`${field}\` = VALUES(\`${field}\`)`).join(', ')}`
    : '';
  return `INSERT INTO \`${table}\` (${fields.map(field => `\`${field}\``).join(', ')}) VALUES (${fields.map(field => escapeSql(toSqlValue(row[field]))).join(', ')})${updateClause};`;
};

const exportCollection = async (
  database: ReturnType<typeof getFirestore>,
  table: TableName
) => {
  const statements: string[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = database.collection(table).orderBy(FieldPath.documentId()).limit(300);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const document of snapshot.docs) {
      const row: Record<string, unknown> = { id: document.id };
      for (const [key, value] of Object.entries(document.data())) {
        const column = toColumn(key);
        if (column === 'id') continue;
        if (!allowedColumns[table].has(column)) {
          throw new Error(`Kolom ${key} pada ${table}/${document.id} tidak ada di skema TiDB.`);
        }
        row[column] = normalizeValue(column, value);
      }
      statements.push(insertStatement(table, row));
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 300) break;
  }

  return statements;
};

const main = async () => {
  const { serviceAccount, databaseId } = getServiceAccount();
  const outputPath = path.resolve(process.argv[2] || 'database/firestore-to-tidb.sql');
  const adminApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id!,
      clientEmail: serviceAccount.client_email!,
      privateKey: serviceAccount.private_key!.replace(/\\n/g, '\n'),
    }),
    projectId: serviceAccount.project_id,
  }, 'firestore-to-tidb-sql-export');

  try {
    const database = getFirestore(adminApp, databaseId);
    const statements = ['USE `kravent_bike`;'];
    const counts: string[] = [];
    for (const table of tables) {
      const tableStatements = await exportCollection(database, table);
      statements.push(`-- ${table}: ${tableStatements.length} records`);
      statements.push(...tableStatements);
      counts.push(`${table}=${tableStatements.length}`);
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${statements.join('\n')}\n`, 'utf8');
    console.log(`SQL berhasil dibuat di ${outputPath}`);
    console.log(`Jumlah data: ${counts.join(', ')}`);
    console.log('File berisi data pelanggan. Jangan dibagikan atau commit ke Git.');
  } finally {
    await deleteApp(adminApp);
  }
};

main().catch(error => {
  console.error('Ekspor SQL gagal:', error);
  process.exitCode = 1;
});
