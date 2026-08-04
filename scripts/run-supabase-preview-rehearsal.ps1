#Requires -Version 5.1
<#
.SYNOPSIS
  Ensayo Neon -> Supabase Preview (Fase 2 operacional).

.DESCRIPTION
  Implementa docs/operations/supabase-preview-database-rehearsal.md.
  Requiere variables de entorno en el proceso (nunca en archivos del repo):

  - NEON_DIRECT_URL
  - SUPABASE_PREVIEW_SESSION_URL
  - SUPABASE_PREVIEW_TRANSACTION_URL
  - DUMP_PATH
  - MIGRATION_REPORT_PATH

  Uso:
    .\scripts\run-supabase-preview-rehearsal.ps1
    .\scripts\run-supabase-preview-rehearsal.ps1 -Step dump
    .\scripts\run-supabase-preview-rehearsal.ps1 -Step verify -SkipCleanup
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
  Write-Host "[rehearsal] $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is not available in PATH"
  }
}

function Initialize-MigrationPaths {
  if (-not $env:DUMP_PATH -or -not $env:MIGRATION_REPORT_PATH) {
    $migrationRoot = Join-Path $env:TEMP 'liga-futbol-supabase-preview'
    New-Item -ItemType Directory -Force -Path $migrationRoot | Out-Null
    if (-not $env:DUMP_PATH) {
      $env:DUMP_PATH = Join-Path $migrationRoot 'neon-preview.sql'
    }
    if (-not $env:MIGRATION_REPORT_PATH) {
      $env:MIGRATION_REPORT_PATH = Join-Path $migrationRoot 'verification.json'
    }
    Write-Step "Rutas temporales: DUMP_PATH y MIGRATION_REPORT_PATH bajo $migrationRoot"
  }
}

function Test-RehearsalEnvironment {
  Write-Step 'Validando entorno'
  $requiredVariables = @(
    'NEON_DIRECT_URL',
    'SUPABASE_PREVIEW_SESSION_URL',
    'SUPABASE_PREVIEW_TRANSACTION_URL',
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

  $nodeVersion = (node --version).TrimStart('v')
  if (-not $nodeVersion.StartsWith('22.')) {
    Write-Warning "Node $nodeVersion detectado; el contrato operacional exige Node 22.x"
  }

  Assert-Command pg_dump
  Assert-Command psql

  pg_dump --version | Out-Null
  psql --version | Out-Null
}

function Test-DatabaseIdentities {
  Write-Step 'Confirmando identidades de origen y Preview'
  psql --dbname="$env:NEON_DIRECT_URL" `
    --no-align `
    --tuples-only `
    --command="SELECT current_database(), current_user, current_setting('server_version');"
  if ($LASTEXITCODE -ne 0) { throw 'Neon identity query failed' }

  psql --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
    --no-align `
    --tuples-only `
    --command="SELECT current_database(), current_user, current_setting('server_version');"
  if ($LASTEXITCODE -ne 0) { throw 'Preview identity query failed' }
}

function Test-PreviewEmpty {
  Write-Step 'Confirmando que Preview public está vacío'
  $previewTableCount = psql `
    --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
    --no-align `
    --tuples-only `
    --command="SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"

  if ($LASTEXITCODE -ne 0) {
    throw 'Preview table inventory query failed'
  }

  if ([int]$previewTableCount -ne 0) {
    throw "Supabase Preview public schema must be empty (found $previewTableCount tables)"
  }
}

function Test-RepositoryMigrations {
  Write-Step 'Confirmando inventario de 20 migraciones'
  $migrationCount = (Get-ChildItem prisma/migrations -Directory).Count
  if ($migrationCount -ne 20) {
    throw "Expected 20 repository migrations; found $migrationCount"
  }

  $verified = npx tsx -e "import { readRepositoryMigrations } from './scripts/lib/database-migration-verifier'; void readRepositoryMigrations().then((items) => console.log(items.length))"
  if ($LASTEXITCODE -ne 0 -or [int]$verified -ne 20) {
    throw 'Repository migration inventory verification failed'
  }
}

function Invoke-NeonDump {
  Write-Step 'Creando dump desde Neon'
  pg_dump `
    --dbname="$env:NEON_DIRECT_URL" `
    --clean `
    --if-exists `
    --schema=public `
    --quote-all-identifiers `
    --no-owner `
    --no-privileges `
    --file="$env:DUMP_PATH"

  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
  }

  $dump = Get-Item $env:DUMP_PATH
  if ($dump.Length -eq 0) {
    throw 'pg_dump created an empty file'
  }

  $hash = Get-FileHash -Algorithm SHA256 $env:DUMP_PATH
  Write-Step "Dump SHA-256: $($hash.Hash)"
}

function Invoke-PreviewRestore {
  Write-Step 'Restaurando dump en Supabase Preview'
  psql `
    --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
    --set=ON_ERROR_STOP=1 `
    --file="$env:DUMP_PATH"

  if ($LASTEXITCODE -ne 0) {
    throw "Preview restore failed with exit code $LASTEXITCODE"
  }
}

function Invoke-PrismaStatus {
  Write-Step 'Comprobando Prisma migrate status en Preview'
  $env:DIRECT_URL = $env:SUPABASE_PREVIEW_SESSION_URL
  npx prisma migrate status
  if ($LASTEXITCODE -ne 0) {
    throw "prisma migrate status failed with exit code $LASTEXITCODE"
  }
}

function Invoke-SnapshotVerification {
  Write-Step 'Comparando inventarios Neon vs Preview'
  if (Test-Path $env:MIGRATION_REPORT_PATH) {
    Remove-Item -Force $env:MIGRATION_REPORT_PATH
  }

  npm run db:verify:migration
  if ($LASTEXITCODE -ne 0) {
    throw "Database verification failed with exit code $LASTEXITCODE"
  }
}

function Invoke-TransactionPoolProbe {
  Write-Step 'Probando Transaction Pooler de Preview'
  $env:DATABASE_URL = $env:SUPABASE_PREVIEW_TRANSACTION_URL
  npx tsx -e "import { db } from './src/lib/db'; void (async () => { const count = await db.user.count(); console.log('[preview-transaction] User rows:', count); await db.`$disconnect() })()"
  if ($LASTEXITCODE -ne 0) {
    throw 'Transaction pooler probe failed'
  }
}

function Invoke-Cleanup {
  if ($SkipCleanup) {
    Write-Step 'Cleanup omitido (-SkipCleanup)'
    return
  }

  Write-Step 'Eliminando artefactos locales'
  Remove-Item -Force $env:DUMP_PATH -ErrorAction SilentlyContinue
  Remove-Item -Force $env:MIGRATION_REPORT_PATH -ErrorAction SilentlyContinue

  if (Test-Path $env:DUMP_PATH) { throw 'Dump cleanup failed' }
  if (Test-Path $env:MIGRATION_REPORT_PATH) { throw 'Report cleanup failed' }
}

Initialize-MigrationPaths

switch ($Step) {
  'validate' {
    Test-RehearsalEnvironment
    Test-DatabaseIdentities
    Test-PreviewEmpty
    Test-RepositoryMigrations
  }
  'dump' {
    Test-RehearsalEnvironment
    Test-DatabaseIdentities
    Test-PreviewEmpty
    Test-RepositoryMigrations
    Invoke-NeonDump
  }
  'restore' {
    Test-RehearsalEnvironment
    Invoke-PreviewRestore
  }
  'prisma' {
    Test-RehearsalEnvironment
    Invoke-PrismaStatus
  }
  'verify' {
    Test-RehearsalEnvironment
    Invoke-SnapshotVerification
    Invoke-TransactionPoolProbe
  }
  'transaction' {
    Test-RehearsalEnvironment
    Invoke-TransactionPoolProbe
  }
  'cleanup' {
    Invoke-Cleanup
  }
  'all' {
    Test-RehearsalEnvironment
    Test-DatabaseIdentities
    Test-PreviewEmpty
    Test-RepositoryMigrations
    Invoke-NeonDump
    Invoke-PreviewRestore
    Invoke-PrismaStatus
    Invoke-SnapshotVerification
    Invoke-TransactionPoolProbe
    Invoke-Cleanup
    Write-Step 'Ensayo completado'
  }
}
