# AgriSync

AgriSync is a farmer-facing rice farm record and expense monitoring application for tracking farm profiles, plots, expenses, visits, cash advances, harvest income, and seasonal budgets. It is a React + TypeScript + Vite progressive web app.

## Features

- Supabase email/password accounts and farmer records stored in PostgreSQL.
- A local browser cache for offline access, with changes uploaded to the database when connected.
- Dashboard summaries for the signed-in farmer's records.
- Plot, expense, and farm-visit records linked to a farm profile.
- Cash-advance records with repayment tracking and due dates, including an “After harvest” option. Cash advances do not use an interest rate.
- Rice harvest tracking by date, season, harvested kilograms, and sale price per kilogram.
- Per-farmer, per-season expense budgets with remaining/over-budget and profit/loss summaries. Net profit is harvest income minus recorded expenses; cash advances are not counted as income.
- The farmer sets the active rice season on their profile. New cash advances, expenses, visits, harvests, budgets, and plots use that season automatically. Changing the season on an existing profile preserves past records and resets plot planting plans; cash advances, expenses, analytics, and finance reports can be filtered by season.
- Search and filters for reviewing farm records.
- Expense add, edit, and delete, assigned automatically to the farmer's active season.
- Excel-compatible CSV finance reports and print-to-PDF reports.
- Downloadable, validated account backups with restore.
- Password recovery through Supabase Auth.
- Offline access to locally saved records with automatic Supabase sync on reconnect.

## Database setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the migration files in timestamp order: [`20261021000000_create_farmer_data.sql`](./supabase/migrations/20261021000000_create_farmer_data.sql), [`20261022000000_add_farmer_number.sql`](./supabase/migrations/20261022000000_add_farmer_number.sql), then [`20261101000000_normalize_farmer_records.sql`](./supabase/migrations/20261101000000_normalize_farmer_records.sql). The third migration creates relational record tables, foreign keys, RLS policies, transactional synchronization functions, and backfills existing `farmer_data.data` records without dropping tables or deleting the legacy snapshot.

**Current production project:** migration 1's `farmer_data` table already existed. Migrations 2 and 3 were applied through the Supabase Dashboard SQL Editor on 2026-11-01; existing `farmer_data` rows and JSON snapshots were retained. All ten relational tables, RLS policies, foreign keys, RPC grants, and anonymous read isolation were checked after migration. The dashboard reported no backups at the time, so this was done only after the project owner confirmed the existing single account/profile was example data. Before using Supabase CLI `db push` against this already-migrated project, reconcile the remote migration history; SQL Editor execution does not register versions in the CLI migration history table. Do not blindly replay the backfill migration against data that has since changed.
3. In the project root beside `package.json`, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings. The publishable/anon key is intended for browser use; never put a `service_role` key in this app.
4. Restart the Vite dev server. Configure the same two environment variables in your deployment provider before building.
5. In Supabase Authentication settings, configure the allowed site/redirect URLs for local development and your deployed domain. If email confirmation is enabled, new users must confirm their email before signing in.

Authentication is handled by Supabase Auth. Each signed-in account can access only its own farmer records; row-level security is enforced on every relational table. Relational saves run through an authenticated PostgreSQL function as a single transaction. Record IDs are stable across retries, so repeating a save upserts rather than duplicates records. A disconnected browser keeps edits locally, retries failed cloud operations on reconnect or when restoring a saved account, and uploads its current account snapshot even when a restored backup has no outbox entries. A previously authenticated user can continue viewing the local cache while offline; first-time registration and sign-in still require a network connection. Changes made while an upload is in flight remain pending until a later snapshot includes them. The app blocks sign-out if there are unsynced changes and no network.

Cloud records are protected by Supabase Auth and RLS. Offline browser records use the browser's local storage and are not encrypted by this app; use a trusted, device-locked browser profile and sign out only after syncing when using a shared device.

Farm data is stored in relational tables: `farmer_profiles`, `farm_plots`, `farmer_visits`, `cash_advances`, `cash_advance_repayments`, `farmer_notes`, `cash_advance_emails`, `farm_expenses`, `farm_harvests`, and `season_budgets`. Foreign keys enforce farmer ownership relationships and cascade related records when a farmer or cash advance is deleted. `farmer_data.user_id` remains the Supabase Auth UUID and `farmer_number` is a separate sequential account number. The new migration backfills existing JSON records and keeps the original `farmer_data.data` snapshot intact as a legacy archive; current application reads and writes use normalized tables. Concurrent multi-device edits still use a whole-account synchronization operation and do not have field-level conflict merging; treat one device as the editor at a time.

The Sync Center synchronizes farm records with Supabase. Cash-advance email updates are sent through EmailJS only when its service ID, template ID, and public key are configured in **Settings**; unconfigured or failed email attempts remain marked as failed and are never reported as delivered. The farmer contact action opens the device's SMS application to compose a message; AgriSync itself does not send SMS or provide USSD/mobile-money services. Historical SMS data is retained in existing account records.

Password recovery requires the deployed domain and `/reset-password` redirect URL to be allowed in Supabase Authentication settings. For email-confirmation registration, configure the corresponding confirmation redirect URLs as well.

Finance backups are private files. Store them securely; restoring one replaces current account data and is limited to farmer profile IDs belonging to the signed-in account. CSV exports open in spreadsheet tools such as Excel. The PDF action opens the browser print dialog; choose **Save as PDF**.

Existing accounts and records from the MySQL version are not automatically migrated. Browser-local records are preserved under `agriledger.legacy.db.v1` and are not uploaded automatically.

## Requirements

- Node.js and npm

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Install on a phone or computer

Deploy the production build to an HTTPS URL, then open that URL in a supported browser. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment provider before building. The repository includes Netlify and Vercel deployment configuration; the production output is `dist/`.

Do not install the app from the Vite development address (`localhost:5173`). That address is served by `npm run dev`, so an installation from it stops opening when the development server is off. Install from the deployed HTTPS address instead; the installed app then opens without VS Code or a local server.

Use the **Install app** prompt when offered, or select **Install app / Add to Home screen** from the browser menu. On iPhone or iPad, open the site in Safari, tap **Share**, then choose **Add to Home Screen**. Open the deployed site once while online so the service worker can cache the app shell. After that, AgriSync can reopen offline with its saved sign-in and local records; changes made offline remain on the device until a connection is available to sync them.

## Final verification checklist

Before a defense or production release, use the deployed site and real test accounts to verify:

1. Supabase configuration and schema: confirm the Vercel/Netlify build environment has the project URL and publishable/anon key, apply the migration, sign in, and save/reload a record.
2. Account isolation: create two test accounts and confirm neither can read or modify the other's records.
3. Offline recovery: create and edit records offline, reconnect, wait for **Saved** in Sync Status, reload, and confirm each record is present once.
4. Registration and password recovery: test email confirmation, reset-email delivery, and the configured redirect URLs.
5. Production routing: open direct links (including `/login`, `/forgot-password`, and `/reset-password`) on the deployed HTTPS site.
6. Finance: verify a seasonal budget against expenses and compare profit with harvest quantity × price.
7. Backup and reports: download a backup, restore it to the same test account, and open CSV/print reports.

Repository build and lint checks cannot prove a live Supabase key, RLS behavior between real accounts, email delivery, or an external deployment is working. Keep credentials private; do not put a Supabase service-role key in client environment variables.

## Checks and production build

```sh
npm run lint
npm run build
npm run preview
```

The production build is generated in `dist/`.
