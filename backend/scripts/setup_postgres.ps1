# Interactive PostgreSQL setup for Insights Iva (native PostgreSQL on Windows).
# Run from the backend/ folder in PowerShell:
#   .\scripts\setup_postgres.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "=== Insights Iva - PostgreSQL setup ===" -ForegroundColor Cyan
Write-Host ""

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq "Running" }

if (-not $pgService) {
    Write-Host "WARNING: No running postgresql Windows service detected." -ForegroundColor Yellow
    Write-Host "Start PostgreSQL from Services (services.msc) or pgAdmin first." -ForegroundColor Yellow
    Write-Host ""
}

$securePassword = Read-Host "Enter your PostgreSQL postgres superuser password" -AsSecureString
if ($null -eq $securePassword) {
    Write-Host "ERROR: Password cannot be empty." -ForegroundColor Red
    exit 1
}

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    Write-Host "ERROR: Password cannot be empty." -ForegroundColor Red
    exit 1
}

$env:POSTGRES_ADMIN_PASSWORD = $adminPassword
$adminPassword = $null

Write-Host ""
Write-Host "Creating role insights_user and database insights_iva..." -ForegroundColor Green
python scripts/setup_postgres_local.py
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Applying Alembic schema (alembic upgrade head)..." -ForegroundColor Green
alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ""
$migrate = Read-Host "Copy data from smrt.db into PostgreSQL now? (y/N)"
if ($migrate -match "^[Yy]$") {
    Write-Host "Migrating data from SQLite (smrt.db is read-only)..." -ForegroundColor Green
    $env:SOURCE_DATABASE_URL = "sqlite:///./smrt.db"
    python scripts/migrate_sqlite_to_postgres.py
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    Write-Host "Validating row counts..." -ForegroundColor Green
    python scripts/validate_migration.py
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} else {
    Write-Host "Skipped data migration. Run later:" -ForegroundColor Yellow
    Write-Host "  python scripts/migrate_sqlite_to_postgres.py" -ForegroundColor Yellow
    Write-Host "  python scripts/validate_migration.py" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Restart the backend:" -ForegroundColor Cyan
Write-Host "  uvicorn app.main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "DATABASE_URL in .env should be:" -ForegroundColor Cyan
Write-Host "  postgresql+psycopg://insights_user:insights_dev@localhost:5432/insights_iva" -ForegroundColor White
Write-Host ""
