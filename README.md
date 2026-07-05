# High Court Monitoring Cell (HCMC)

High Court Monitoring Cell is a full-stack web application built as an internship project for monitoring High Court-related police cases. The system centralizes case register data, daily cause lists, compliance tracking, affidavit status, alerts, reports, audit logs, and role-based access into one dashboard-driven application.

This project was developed during an 8-week internship at Pattern Effects Labs Pvt. Ltd.

## Project Purpose

High Court-related case monitoring often involves multiple spreadsheets, manual follow-ups, and role-specific reporting. HCMC provides a structured platform where different officers can view and manage case information based on their role and jurisdiction.

The application helps users:

- Maintain a Master High Court Case Register
- Import case data from Excel
- Track daily cause list/hearing dates
- Monitor court directions and compliance deadlines
- Track affidavit preparation and filing status
- Generate alerts and reports
- Maintain audit logs for system activity
- Apply role-based visibility for officers

## Tech Stack

### Frontend

- React
- Vite
- CSS
- Lucide React icons

### Backend

- Node.js
- Express.js
- JWT authentication
- Multer for file uploads
- ExcelJS for Excel processing

### Database and DevOps

- PostgreSQL
- Docker Compose
- Nginx production config
- GitHub Actions CI workflow

## Main Features

## Authentication and Roles

- Secure login using JWT
- Role-based access control
- Jurisdiction-based data scoping
- Supported roles:
  - JCP
  - DCP
  - ACP
  - PI
  - IO
  - SPP
  - HCMC Staff

## Dashboard

The dashboard gives an operational overview of:

- Total High Court register cases
- Active cases
- Critical risk cases
- Hearings for the day
- Pending compliance
- Escalated compliance
- Pending affidavits
- Upcoming hearing calendar
- Jurisdiction-wise case distribution

## Master HC Case Register

The Master HC Register is the main case database. It supports:

- Case creation
- Case listing
- Search and filtering
- Excel upload/import
- Duplicate case handling
- Police station mapping
- Role-scoped case visibility

Only PI users can upload case files/import Excel case data. Other roles can view and read case data according to their access scope.

## Daily Cause List

The Daily Cause List module tracks daily High Court hearings and includes:

- Hearing date tracking
- Case number lookup
- Police station and division filters
- IO/DCP/SPP informed status
- File readiness
- Objections filed status
- Court hall and outcome fields

## Court Direction Status

This module tracks court directions and compliance progress:

- Direction date
- Nature of direction
- Compliance required
- Deadline
- Responsible officer
- Reminder status
- Compliance filed status
- Escalation status

## Affidavit Status

The Affidavit Status module tracks:

- Notice received date
- Remarks sought date
- Remarks received date
- Legal vetting
- Affidavit filed date
- Reason for delay
- Current affidavit status

## Alerts and Notifications

The application includes an Alerts & Notifications page for:

- Cause-list summaries
- Reminder notifications
- Read/unread alert status
- Notification history

The notification system supports a preview mode and has configuration support for real SMS/WhatsApp providers.

## Reports

The project includes reference-style reporting pages:

- Report Summary
- HCMC Reports
- Status-wise reports
- Police-station-wise reports
- Pending affidavit reports
- Delay analysis reports
- Division-wise and sub-division-wise reports

## Audit Logs

Audit logs track platform activity such as:

- Login activity
- Create/update actions
- API resource access
- Actor/user information
- Status codes
- IP address
- Request duration

## Masters and Administration

The UI includes reference-style master pages for:

- Zones
- Divisions
- Sub Divisions
- Police Stations
- Roles
- Permissions
- Role Permissions
- Case Types
- Case Stages
- Court Halls
- Designations
- HC Portal Config
- Nature of Direction
- Workflow lookups
  - Affidavit Status
  - Compliance Required
  - Compliance Status
  - Nature of Risk
  - Order After Appearance

Some master pages currently provide reference-style UI scaffolding and headers. Full CRUD wiring can be extended further.

## UI Features

- Reference-style HCMC sidebar structure
- Monochrome light theme
- Dark mode toggle
- Landing page
- Login page
- Favicon matching the reference website
- Responsive layout
- Table pagination components

## Project Structure

```text
HCMC intern prj/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   ├── public/
│   └── Dockerfile
├── server/                 # Express backend
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── test/
│   └── utils/
├── docs/
├── scripts/
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- Docker Desktop
- Git

Docker Desktop must be running before starting PostgreSQL.

## Environment Setup

The backend uses `server/.env`.

Example:

```env
PORT=5000
DATABASE_URL=postgres://hcmc:hcmc_password@localhost:55432/hcmc
JWT_SECRET=local_hcmc_dev_secret_change_before_production
CLIENT_ORIGIN=http://localhost:5173
DIVISION_DATA_XLSX=C:\Users\admin\Downloads\DivisionData.xlsx
DEFAULT_SEED_PASSWORD=Hcmc@123
NOTIFICATION_PROVIDER=preview
REMINDER_CHANNEL=Preview
AUTOMATION_ENABLED=true
```

## Run Locally

Start Docker Desktop first.

```powershell
cd "C:\Users\admin\Downloads\HCMC intern prj"
docker compose up -d postgres
npm run db:schema --prefix server
npm run db:seed --prefix server
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000/api
```

Health check:

```text
http://localhost:5000/api/health
```

## Demo Login

```text
Email: joint.cp.west@hcmc.local
Password: Hcmc@123
```

QA role test users can also be seeded with:

```powershell
$env:ROLE_TEST_PASSWORD="HcmcRoleTest@2026"
npm run db:seed-roles --prefix server
```

Example QA login:

```text
Email: qa.pi@hcmc.local
Password: HcmcRoleTest@2026
```

## Useful Commands

Install dependencies:

```powershell
npm run install:all
```

Run development servers:

```powershell
npm run dev
```

Apply database schema:

```powershell
npm run db:schema --prefix server
```

Seed data:

```powershell
npm run db:seed --prefix server
```

Run tests:

```powershell
npm test
```

Check backend syntax:

```powershell
npm run check --prefix server
```

Build frontend:

```powershell
npm run build --prefix client
```

## Git Commands

```powershell
git status
git add .
git commit -m "Implement HCMC reference UI and monitoring workflows"
git push
```

## Current Status

The project is in a strong demo/presentation-ready state. The core modules, role-based access, Excel import, dashboard, reports, alerts, audit logs, UI theme, and reference-style navigation are implemented.

Remaining production-level work includes:

- Full CRUD wiring for all master pages
- Real SMS/WhatsApp credentials
- Official court cause-list integration
- Production deployment with HTTPS
- Backup and monitoring setup
- Full end-to-end user acceptance testing

## License

This project was created as an internship project and can be adapted further based on organizational requirements.
