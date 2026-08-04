#Requires -Version 5.1
<#
.SYNOPSIS
  Corte Neon production -> Supabase Production (Fase 3).

.DESCRIPTION
  Requiere variables en el proceso:
  - NEON_DIRECT_URL (rama production de Neon)
  - SUPABASE_SESSION_URL (Session pooler Production, puerto 5432)
  - SUPABASE_TRANSACTION_URL (Transaction pooler Production, puerto 6543)
  - DUMP_PATH
  - MIGRATION_REPORT_PATH
#>
[CmdletBinding()]
param(
  [ValidateSet('all', 'validate', 'dump', 'restore', 'prisma', 'verify', 'transaction', 'cleanup')]
  [string]$Step = 'all',
  [switch]$SkipCleanup
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "[cutover] $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is not available in PATH"
  }
}

function Initialize-MigrationPaths {
  if (-not $env:DUMP_PATH -or -not $env:MIGRATION_REPORT_PATH) {
    $migrationRoot = Join-Path $env:TEMP 'liga-futbol-supabase-production'
    New-Item -ItemType Directory -Force -Path $migrationRoot | Out-Null
    if (-not $env:DUMP_PATH) {
      $env:DUMP_PATH = Join-Path $migrationRoot 'neon-final.sql'
    }
    if (-not $env:MIGRATION_REPORT_PATH) {
      $env:MIGRATION_REPORT_PATH = Join-Path $migrationRoot 'verification.json'
    }
    Write-Step "Rutas temporales bajo $migrationRoot"
  }
}

function Test-CutoverEnvironment {
  Write-Step 'Validando entorno'
  $requiredVariables = @(
    'NEON_DIRECT_URL',
    'SUPABASE_SESSION_URL',
    'SUPABASE_TRANSACTION_URL',
    'DUMP_PATH',
    'MIGRATION_REPORT_PATH'
  )

  foreach ($name in $requiredVariables) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
      throw "$name is required"
    }
  }

  $repositoryRoot = (Resolve-Path '.').Path
  foreach ($candidate in @($env:DUMP_PATH, $env:MIGRATION_REPORT_PATH)) {
    $resolved = [System.IO.Path]::GetFullPath($candidate)
    if ($resolved.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Migration artifacts must be outside the repository"
    }
  }

  Assert-Command pg_dump
  Assert-Command psql
}

function Test-ProductionEmpty {
  Write-Step 'Confirmando que Production public está vacío'
  $tableCount = psql `
    --dbname="$env:SUPABASE_SESSION_URL" `
    --no-align `
    --tuples-only `
    --command="SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"

  if ($LASTEXITCODE -ne 0) { throw 'Production table inventory query failed' }
  if ([int]$tableCount -ne 0) {
    throw "Supabase Production public schema must be empty (found $tableCount tables)"
  }
}

function Invoke-NeonDump {
  Write-Step 'Creando dump final desde Neon'
  pg_dump `
    --dbname="$env:NEON_DIRECT_URL" `
    --clean `
    --if-exists `
    --schema=public `
    --quote-all-identifiers `
    --no-owner `
    --no-privileges `
    --file="$env:DUMP_PATH"

  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
  $hash = Get-FileHash -Algorithm SHA256 $env:DUMP_PATH
  Write-Step "Dump SHA-256: $($hash.Hash)"
}

function Invoke-ProductionRestore {
  Write-Step 'Restaurando dump en Supabase Production'
  psql `
    --dbname="$env:SUPABASE_SESSION_URL" `
    --set=ON_ERROR_STOP=1 `
    --file="$env:DUMP_PATH"

  if ($LASTEXITCODE -ne 0) { throw "Production restore failed with exit code $LASTEXITCODE" }
}

function Invoke-PrismaStatus {
  Write-Step 'Comprobando Prisma migrate status en Production'
  $env:DIRECT_URL = $env:SUPABASE_SESSION_URL
  npx prisma migrate status
  if ($LASTEXITCODE -ne 0) { throw "prisma migrate status failed with exit code $LASTEXITCODE" }
}

function Invoke-SnapshotVerification {
  Write-Step 'Comparando inventarios Neon vs Production'
  if (Test-Path $env:MIGRATION_REPORT_PATH) {
    Remove-Item -Force $env:MIGRATION_REPORT_PATH
  }
  npm run db:verify:migration
  if ($LASTEXITCODE -ne 0) { throw "Database verification failed with exit code $LASTEXITCODE" }
}

function Invoke-TransactionPoolProbe {
  Write-Step 'Probando Transaction Pooler de Production'
  $env:DATABASE_URL = $env:SUPABASE_TRANSACTION_URL
  npx tsx -e "import { db } from './src/lib/db'; void (async () => { const count = await db.user.count(); console.log('[production-transaction] User rows:', count); await db.`$disconnect() })()"
  if ($LASTEXITCODE -ne 0) { throw 'Transaction pooler probe failed' }
}

function Invoke-Cleanup {
  if ($SkipCleanup) {
    Write-Step 'Cleanup omitido (-SkipCleanup)'
    return
  }
  Remove-Item -Force $env:DUMP_PATH -ErrorAction SilentlyContinue
  Remove-Item -Force $env:MIGRATION_REPORT_PATH -ErrorAction SilentlyContinue
}

Initialize-MigrationPaths

switch ($Step) {
  'validate' { Test-CutoverEnvironment; Test-ProductionEmpty }
  'dump' { Test-CutoverEnvironment; Test-ProductionEmpty; Invoke-NeonDump }
  'restore' { Test-CutoverEnvironment; Invoke-ProductionRestore }
  'prisma' { Test-CutoverEnvironment; Invoke-PrismaStatus }
  'verify' { Test-CutoverEnvironment; Invoke-SnapshotVerification; Invoke-TransactionPoolProbe }
  'transaction' { Test-CutoverEnvironment; Invoke-TransactionPoolProbe }
  'cleanup' { Invoke-Cleanup }
  'all' {
    Test-CutoverEnvironment
    Test-ProductionEmpty
    Invoke-NeonDump
    Invoke-ProductionRestore
    Invoke-PrismaStatus
    Invoke-SnapshotVerification
    Invoke-TransactionPoolProbe
    Invoke-Cleanup
    Write-Step 'Corte completado'
  }
}
