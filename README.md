# GreenSky Solar

Next.js application with PostgreSQL-backed backend foundations.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally or remotely

## Environment Variables

Copy `.env.example` to `.env.local` and update `DATABASE_URL`:

```bash
cp .env.example .env.local
```

Example:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/greensky_solar_p
```

## Database Setup

Run migration and seed:

```bash
npm run db:migrate
npm run db:seed
```

This applies:

- `db/schema.sql` (tables, enums, constraints)
- `db/seed.sql` (minimal starter records)

## Run the App

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Backend Endpoints Added

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `GET /api/client/bookings`
- `GET /api/client/documents`
- `POST /api/client/documents`

## Seed Default Passwords

After running `npm run db:seed`, admin and technician seed users have their passwords set. Default password: `Admin123!` (override with `SEED_DEFAULT_PASSWORD` env var).

- Admin: `admin@greensky.com` / `Admin123!`
- Technician: `lead.tech@greensky.com` / `Admin123!`

## Notes

- This step sets up the database schema and server data layer.
- UI pages are not yet fully migrated to call these APIs directly.
