# BPDA Telemedicine — Dedicated Server Deployment

This version is converted from Supabase Edge Functions to a self-hosted webapp with your own backend, SQLite database, and JWT authentication.

## Backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

Default backend URL: `http://localhost:4000/api`

Default admin login seeded on first start:

- Email: `admin@bpda.com`
- Password: `admin123`

Change these in `server/.env` before production:

```env
JWT_SECRET=use-a-long-random-secret
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-strong-password
CORS_ORIGIN=https://your-domain.com
DATABASE_PATH=/var/lib/bpda/bpda.sqlite
```

## Frontend

Set frontend API URL:

```env
VITE_API_BASE_URL=https://your-domain.com/api
```

Then build and deploy the frontend with your preferred static host or reverse proxy.

## Production reverse proxy example

Route:

- `/api/*` to Node backend on port `4000`
- all other routes to the frontend static build

Use HTTPS with Nginx/Caddy/Traefik.

## Database

The backend uses SQLite through `better-sqlite3`. The database file is created automatically at `DATABASE_PATH`.

Back up this file regularly in addition to using the admin ZIP export.
