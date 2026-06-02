# High Court Monitoring Cell (HCMC)

Phase 1 scaffold for the West Zone High Court Monitoring Cell app.

## What is implemented

- React/Vite frontend with login, sidebar, dashboard, and Master HC Register.
- Express API with JWT login.
- PostgreSQL schema for hierarchy, users, and `master_hc_register`.
- Role-aware case scoping helpers.
- Seed script that imports master data from `DivisionData.xlsx`.
- Docker Compose PostgreSQL service on `localhost:55432`.

## Local setup

1. Install dependencies:

```bash
npm run install:all
```

2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Apply schema:

```bash
npm run db:schema
```

4. Seed hierarchy/users from Excel:

```bash
npm run db:seed
```

The seed script reads:

```text
C:\Users\admin\Downloads\DivisionData.xlsx
```

Seeded users use this local development password:

```text
Hcmc@123
```

Example login:

```text
joint.cp.west@hcmc.local
```

5. Start the app:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:5000/api`

## Notes

- `PoliceStation: Honeywell` is skipped during seed because the source Excel row has missing/error values for division and zone.
- Change `JWT_SECRET` and seeded passwords before any non-local use.
