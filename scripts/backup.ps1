param(
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$BackupDirectory = "backups",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = Join-Path $root $BackupDirectory
New-Item -ItemType Directory -Force -Path $target | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "hcmc-$timestamp.sql.gz"
$backupFile = Join-Path $target $backupName

docker compose -f (Join-Path $root $ComposeFile) exec -T postgres sh -c "pg_dump -U `$POSTGRES_USER -d `$POSTGRES_DB | gzip > /backups/$backupName"
Get-ChildItem -LiteralPath $target -Filter "hcmc-*.sql.gz" | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) | Remove-Item -Force
Write-Host "Backup created: $backupFile"
