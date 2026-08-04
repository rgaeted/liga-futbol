# Ensayo Neon → Supabase Preview

Este procedimiento restaura una copia inmóvil de Neon en un proyecto
Supabase Preview aislado. Supabase Production todavía no existe y no se crea
durante esta fase.

## Contrato de proyectos

1. Usar Node.js 22.x.
2. Crear un proyecto Supabase exclusivo para Preview en South America
   (São Paulo), si la región está disponible.
3. Guardar la contraseña del proyecto Preview en el gestor de secretos.
4. Cargar su Session Pooler en `SUPABASE_PREVIEW_SESSION_URL`.
5. Cargar su Transaction Pooler en `SUPABASE_PREVIEW_TRANSACTION_URL`.
6. Crear una rama Neon llamada `supabase-preview-rehearsal`.
7. No conectar aplicaciones ni ejecutar escrituras en esa rama Neon.
8. Cargar su conexión directa en `NEON_DIRECT_URL`.
9. No crear el proyecto Supabase Production durante esta fase.
10. No copiar URLs reales en archivos, comandos, documentación o tickets.

## Rutas operacionales externas

El dump y el reporte deben vivir bajo el directorio temporal del usuario,
fuera del repositorio:

```powershell
$migrationRoot = Join-Path $env:TEMP 'liga-futbol-supabase-preview'
$env:DUMP_PATH = Join-Path $migrationRoot 'neon-preview.sql'
$env:MIGRATION_REPORT_PATH = Join-Path $migrationRoot 'verification.json'

New-Item -ItemType Directory -Force -Path $migrationRoot | Out-Null
```

Resultado esperado: exit code `0`; las dos rutas comienzan con el valor de
`$env:TEMP`, no con la raíz del repositorio.

## 1. Validar entorno

```powershell
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
```

Resultado esperado: exit code `0`, sin salida.

## 2. Verificar Node y herramientas PostgreSQL

```powershell
node --version
pg_dump --version
psql --version
```

Resultado esperado:

- Node comienza con `v22.`.
- `pg_dump` y `psql` terminan con exit code `0`.
- La versión principal de `pg_dump` es igual o superior a la versión del
  servidor Neon.

## 3. Confirmar identidades sin imprimir URLs

```powershell
psql --dbname="$env:NEON_DIRECT_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT current_database(), current_user, current_setting('server_version');"

psql --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT current_database(), current_user, current_setting('server_version');"
```

Resultado esperado:

- Ambos comandos terminan con exit code `0`.
- Las identidades de origen y Preview son distintas.
- Ninguna salida contiene contraseña ni connection string.

## 4. Confirmar que Preview está vacío

```powershell
$previewTableCount = psql `
  --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"

if ($LASTEXITCODE -ne 0) {
  throw "Preview table inventory query failed"
}

if ([int]$previewTableCount -ne 0) {
  throw "Supabase Preview public schema must be empty"
}
```

Resultado esperado: exit code `0`; `$previewTableCount` vale `0`.

Si no está vacío, crear un proyecto Preview nuevo. No limpiar ni reutilizar
Supabase Production.

## 5. Confirmar las 20 migraciones del repositorio

```powershell
$migrationCount = (
  Get-ChildItem prisma/migrations -Directory
).Count

if ($migrationCount -ne 20) {
  throw "Expected 20 repository migrations; found $migrationCount"
}

npx tsx -e 'import { readRepositoryMigrations } from "./scripts/lib/database-migration-verifier"; void readRepositoryMigrations().then((items) => console.log(items.length))'
```

Resultado esperado:

```text
20
```

Una cantidad distinta detiene el ensayo y exige revisar el contrato antes
de continuar.

## 6. Crear el dump de la rama Neon aislada

```powershell
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
  throw "pg_dump created an empty file"
}

Get-FileHash -Algorithm SHA256 $env:DUMP_PATH
```

Resultado esperado:

- `pg_dump` termina con exit code `0`.
- El dump tiene tamaño mayor que cero.
- Se registra su SHA-256 en la evidencia operacional.
- El dump permanece bajo `$env:TEMP` y nunca entra al repositorio.

## 7. Restaurar en Supabase Preview

```powershell
psql `
  --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --set=ON_ERROR_STOP=1 `
  --file="$env:DUMP_PATH"

if ($LASTEXITCODE -ne 0) {
  throw "Preview restore failed with exit code $LASTEXITCODE"
}
```

Resultado esperado: exit code `0`. Avisos de `DROP ... IF EXISTS` son
aceptables; errores SQL no lo son.

## 8. Comprobar Prisma sin reaplicar migraciones

```powershell
$env:DIRECT_URL = $env:SUPABASE_PREVIEW_SESSION_URL

npx prisma migrate status

if ($LASTEXITCODE -ne 0) {
  throw "prisma migrate status failed with exit code $LASTEXITCODE"
}
```

Resultado esperado:

```text
20 migrations found in prisma/migrations
Database schema is up to date!
```

No ejecutar `prisma migrate deploy`, `prisma migrate dev` ni
`prisma db push`: el dump ya preserva schema y `_prisma_migrations`.

## 9. Comparar Neon y Supabase Preview

```powershell
if (Test-Path $env:MIGRATION_REPORT_PATH) {
  Remove-Item -Force $env:MIGRATION_REPORT_PATH
}

npm run db:verify:migration

if ($LASTEXITCODE -ne 0) {
  throw "Database verification failed with exit code $LASTEXITCODE"
}
```

Resultado esperado:

```text
[verify-db] Neon and Supabase Preview snapshots match.
[verify-db] 20 repository migrations verified.
[verify-db] 15 public tables inventoried with 0 FK orphans.
[verify-db] 5 BYTEA columns verified.
[verify-db] Report written outside repository.
```

El reporte externo preserva ambos inventarios completos de tablas con sus
conteos, migraciones, usuarios, agrupaciones, FKs y columnas `BYTEA`. No
contiene URLs.

## 10. Probar Transaction Pooler de Preview

```powershell
$env:DATABASE_URL = $env:SUPABASE_PREVIEW_TRANSACTION_URL

npx tsx -e 'import { db } from "./src/lib/db"; void (async () => { const count = await db.user.count(); console.log("[preview-transaction] User rows:", count); await db.$disconnect() })()'
```

Resultado esperado: exit code `0` y una línea
`[preview-transaction] User rows:` cuyo número coincide con el inventario
de `public.User` del reporte.

## 11. Confirmar que Production sigue limpio

Esta comprobación se realiza visualmente en el dashboard Supabase:

- el proyecto usado por los comandos está marcado como Preview;
- el proyecto Production no tiene conexiones de esta sesión;
- no se restauró el dump en Production;
- no se configuró una aplicación contra Production.

Si alguna condición no se cumple, el ensayo se rechaza.

## 12. Cerrar el ensayo

Conservar el SHA-256 y mover el reporte JSON al almacenamiento operacional
seguro del equipo. Eliminar dump y reporte del equipo local:

```powershell
Remove-Item -Force $env:DUMP_PATH
Remove-Item -Force $env:MIGRATION_REPORT_PATH

if (Test-Path $env:DUMP_PATH) {
  throw "Dump cleanup failed"
}

if (Test-Path $env:MIGRATION_REPORT_PATH) {
  throw "Report cleanup failed"
}
```

Resultado esperado: exit code `0`; ambos archivos dejan de existir.
