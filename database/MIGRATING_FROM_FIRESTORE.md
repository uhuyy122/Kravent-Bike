# TiDB storage and legacy Firestore import

The application stores bikes, bookings, expenses, financial settings, WhatsApp OTP challenges, OTP rate limits, and verified phone numbers in TiDB. Firebase Authentication remains enabled for anonymous API bearer tokens. The deployed application does not read or write Firestore.

The Firestore migration scripts below are optional, one-time import tools for existing data. They read Firestore and insert/update rows in TiDB; they do not delete or modify the Firestore source. Avoid running them again after cutover unless you intend to overwrite matching TiDB rows with legacy data.

## Setup

1. Run `database/tidb_schema.sql` in TiDB Cloud to create the application and OTP tables.
2. Configure server-only environment variables locally in `.env` and in Vercel:
   - `TIDB_HOST`
   - `TIDB_PORT`
   - `TIDB_USER`
   - `TIDB_PASSWORD`
   - `TIDB_DATABASE=kravent_bike`
   - `TIDB_SSL_CA` when required by the cluster. It accepts PEM contents (with escaped newlines) or a local CA file path.
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` for Firebase Auth token verification
   - `WHATSAPP_OTP_SECRET` (at least 32 characters)
   - Meta WhatsApp Cloud API settings used to send OTP messages
3. Keep the Firebase client configuration and enable Firebase Anonymous Authentication. Firestore rules and a Firestore database ID are not needed by the deployed application.
4. Deploy the application and verify it can load and save data, request an OTP, and verify a phone number.

## Optional one-time import from Firestore

To import existing Firestore data, also configure `FIRESTORE_DATABASE_ID` in the local `.env`, along with the Firebase service account and TiDB connection variables. Then either:

- Run `npm run export:tidb-sql`, then execute the generated `database/firestore-to-tidb.sql` in TiDB Cloud; or
- Run `npm run migrate:tidb` to copy directly into TiDB.

The generated SQL may contain customer data and is git-ignored. These scripts only migrate the four legacy business collections (`bikes`, `bookings`, `expenses`, and `financial_settings`); OTP challenges and verified-phone records are short-lived and are not imported.
