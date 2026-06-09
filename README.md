```markdown
# High Court Monitoring Cell (HCMC)

HCMC is a full-stack legal case monitoring and compliance tracking web app built for Bengaluru City Police, West Zone. It helps the High Court Monitoring Cell manage High Court cases, hearing dates, compliance deadlines, affidavits, contempt risks, and officer appearances.

## Tech Stack

- React + Vite
- Node.js + Express
- PostgreSQL
- Docker Compose
- JWT Authentication
- ExcelJS + Multer for Excel upload

## Implemented Features

- Landing page and login
- JWT-based authentication
- Role-based access scoping
- Police hierarchy seed data
- Dashboard
- Master HC Register
- Excel upload for case import
- Daily Cause List
- Notification preview
- Compliance Tracker
- Affidavit Status
- Contempt Risk
- Personal Appearance

## Main Modules

### Master HC Register
Add, edit, search, filter, and import High Court cases through Excel upload.

### Daily Cause List
Generate and manage daily High Court listings based on hearing dates.

### Compliance Tracker
Track court directions, compliance deadlines, responsible officers, delay days, and escalations.

### Affidavit Status
Track affidavit preparation, legal vetting, filing status, and delays.

### Contempt Risk
Monitor contempt-risk cases, compliance deadlines, and escalation levels.

### Personal Appearance
Track officer appearance dates, confirmation status, court hall, and post-appearance orders.

## Demo Login

```text
Email: joint.cp.west@hcmc.local
Password: Hcmc@123
```

## Run Locally

```powershell
npm run install:all
docker compose up -d postgres
npm run db:schema
npm run db:seed
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

## Database Tables

```text
zones
divisions
sub_divisions
police_stations
users
master_hc_register
daily_cause_list
compliance_tracker
affidavit_status
contempt_risk
personal_appearance
```

## Remaining Work

- Evening Preparation Log
- Officer Legal Performance Tracker
- Reports and analytics
- Document Repository
- Admin settings
- Real SMS/WhatsApp alerts
- Scheduled reminders
- High Court cause-list auto-polling
```
