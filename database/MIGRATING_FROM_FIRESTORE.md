# Migrating Firestore data to TiDB

The application uses TiDB for bikes, bookings, expenses, and financial settings. Firebase Authentication and Firestore remain required for anonymous user tokens and WhatsApp OTP verification.

The migration scripts copy Firestore document IDs and data into the matching TiDB tables. They do not delete or modify the Firestore source. Re-running either migration updates TiDB rows with matching IDs from Firestore.

1. Rotate any TiDB password or API key that has been shared. Do not reuse credentials shown in screenshots.
2. Ensure `kravent_bike` and its tables exist by running `database/tidb_schema.sql` in TiDB Cloud.
3. Configure the following environment variables in a local `.env` file (never commit this file):
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`
   - `FIRESTORE_DATABASE_ID`
   - `TIDB_HOST`
   - `TIDB_PORT`
   - `TIDB_USER`
   - `TIDB_PASSWORD`
   - `TIDB_DATABASE=kravent_bike`
   - `TIDB_SSL_CA` if the cluster requires a CA certificate
4. Install project dependencies and run `npm run export:tidb-sql`. This creates `database/firestore-to-tidb.sql` locally; that file contains customer data and is git-ignored.
5. Open the generated SQL file locally, run it in the TiDB Cloud SQL Editor, and verify the four tables. Alternatively, set `TIDB_*` in the same local `.env` and run `npm run migrate:tidb` to copy directly without generating SQL.
6. Configure the same TiDB and Firebase server variables in Vercel and deploy the application.
7. Confirm the application loads and can create/read a test record before considering cutover complete. Keep Firestore intact until the TiDB data and application have been verified.

The migration requires read access to Firestore and insert/update access to the four TiDB tables. It does not use a TiDB Cloud API key; use the SQL connection credentials.
