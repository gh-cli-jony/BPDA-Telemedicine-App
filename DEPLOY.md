# BPDA Telemedicine — Production Deployment Guide

## Frontend (public_html)

1. Set your production API URL in one of these ways:
   - **Build-time**: copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
   - **Runtime**: edit `public/config.js` and set `window.BPDA_API_BASE_URL`.
2. Run `npm run build`.
3. Upload the contents of the `dist/` folder to your hosting `public_html` directory.
4. A ready-made zip is available at `bpda-telemedicine-public_html.zip`.

## Backend (Express server)

The included Express server (`server/`) connects to Microsoft SQL Server using the `mssql` package.

### Prerequisites

- Microsoft SQL Server (Express, Standard, or Azure SQL)
- Create the target database before starting the server (tables are auto-created).

### Setup

1. Copy `server/.env.example` to `server/.env` and fill in your SQL Server credentials.
2. `cd server && npm install`
3. `npm run start` (or `npm run dev` for watch mode)
4. Default API root: `http://localhost:4000/api`

### Environment variables

- `PORT` — server port (default 4000)
- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — MS SQL connection
- `DB_ENCRYPT` — use TLS encryption (default `true`)
- `DB_TRUST_CERT` — trust self-signed certificates (default `false`)
- `JWT_SECRET` — change in production
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — default admin account
- `CORS_ORIGIN` — restrict to your frontend domain in production

## Supabase Edge Function

Alternatively, deploy the Supabase Edge Function in `supabase/functions/server/` and point the frontend to it via `VITE_API_BASE_URL`.

## Important Configuration

- `public/config.js` in the uploaded site lets you change the API URL without rebuilding.
- Do not commit real API keys or database credentials to version control.
