# Production Deployment

1. Copy `.env.production.example` to `.env.production` and replace every placeholder with a secret from the deployment secret manager.
2. Terminate HTTPS at the approved government reverse proxy/load balancer and forward to port 80. Do not expose PostgreSQL publicly.
3. Run `docker compose -f docker-compose.prod.yml build`.
4. Apply the schema with `docker compose -f docker-compose.prod.yml run --rm server node scripts/applySchema.js`.
5. Start with `docker compose -f docker-compose.prod.yml up -d`.
6. Verify `/api/health`, login, role scoping, uploads, notifications in preview mode, and cause-list polling.

## Backups

Schedule `powershell -File scripts/backup.ps1` daily. Keep encrypted off-host copies and test a restore quarterly. The database volume and document upload volume must both be backed up.

## HTTPS and Monitoring

Use an organization-issued TLS certificate at the reverse proxy. Monitor container restarts, disk usage, database health, `/api/health`, failed poll runs, failed notification logs, and HTTP 5xx rates. Alert the HCMC operator when scheduled cause-list polling fails.

## Go-Live Gate

Keep `NOTIFICATION_PROVIDER=preview` until Twilio sender registration, WhatsApp template approval, recipient consent, and one controlled delivery test are complete. The public eCourts portal can require interactive CAPTCHA; production polling needs a court-approved stable feed URL in `HC_CAUSE_LIST_URL`.
