# AgriSync

AgriSync is a farmer-facing farm-record application for tracking farm profiles, plots, expenses, visits, and cash advances received. It is a React + TypeScript + Vite progressive web app.

## Features

- Supabase email/password accounts and farmer records stored in PostgreSQL.
- A local browser cache for offline access, with changes uploaded to the database when connected.
- Dashboard summaries for the signed-in farmer's records.
- Plot, expense, and farm-visit records linked to a farm profile.
- Cash-advance records with repayment tracking and due dates, including an “After harvest” option. Cash advances do not use an interest rate.
- Search and filters for reviewing farm records.
- CSV export for expense reports.
- Offline access to locally saved records, with a sync queue and sync simulator.

## Database setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261021000000_create_farmer_data.sql`](./supabase/migrations/20261021000000_create_farmer_data.sql). This creates a per-account data table protected by row-level security.
3. In the project root beside `package.json`, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings. The publishable/anon key is intended for browser use; never put a `service_role` key in this app.
4. Restart the Vite dev server. Configure the same two environment variables in your deployment provider before building.
5. In Supabase Authentication settings, configure the allowed site/redirect URLs for local development and your deployed domain. If email confirmation is enabled, new users must confirm their email before signing in.

Authentication is handled by Supabase Auth. Each signed-in account can access only its own `farmer_data` row; row-level security is enforced by the migration. Records are cached in the browser for offline access and saved to Supabase when online.

The Sync Status page still includes a simulator for SMS, USSD, and email delivery. Those channels do not deliver messages. Saving farm records to Supabase is separate from the message simulator.

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

## Checks and production build

```sh
npm run lint
npm run build
npm run preview
```

The production build is generated in `dist/`.
