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
- Rice-season rollover per farmer: preserve completed-season history, start a distinct new season, and reset existing plot planting dates, yield estimates, and health without deleting plots.
- Search and filters for reviewing farm records.
- Expense add, edit, and delete, with season assignment.
- Excel-compatible CSV finance reports and print-to-PDF reports.
- Downloadable, validated account backups with restore.
- Password recovery through Supabase Auth.
- Offline access to locally saved records with automatic Supabase sync on reconnect.

## Database setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261021000000_create_farmer_data.sql`](./supabase/migrations/20261021000000_create_farmer_data.sql). This creates a per-account data table protected by row-level security.
3. In the project root beside `package.json`, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings. The publishable/anon key is intended for browser use; never put a `service_role` key in this app.
4. Restart the Vite dev server. Configure the same two environment variables in your deployment provider before building.
5. In Supabase Authentication settings, configure the allowed site/redirect URLs for local development and your deployed domain. If email confirmation is enabled, new users must confirm their email before signing in.

Authentication is handled by Supabase Auth. Each signed-in account can access only its own `farmer_data` row; row-level security is enforced by the migration. Records are cached in the browser for offline access and saved to Supabase when online. Saves use an upsert against the account's unique `user_id`, so retrying an upload does not create duplicate account rows. A disconnected browser keeps edits locally, retries them on reconnect, and blocks sign-out if there are unsynced changes and no network.

Cloud records are protected by Supabase Auth and RLS. Offline browser records use the browser's local storage and are not encrypted by this app; use a trusted, device-locked browser profile and sign out only after syncing when using a shared device.

Harvest and budget records are stored alongside the existing records in the account's JSON `data` field; the existing table migration remains sufficient. This single-row JSON design is simple to back up and restore, but is less suitable for concurrent edits from multiple devices and detailed SQL reporting than normalized per-entity tables.

The Sync Status page has a **Supabase account sync** control for saving actual farm records and a separate message-channel simulator. SMS, USSD, and email simulator actions do not deliver messages and are not evidence of a successful database sync.

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
