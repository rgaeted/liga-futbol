# Despliegue en producción

Stack actual: **Vercel** (Next.js, región `gru1`) + **Supabase Production** (Postgres + Realtime, São Paulo) + **GitHub**.

**URL de producción:** https://torneos-kelme.vercel.app

## Vercel y Supabase Production

- Runtime: Node.js 22.x.
- Región Vercel: `gru1`.
- Supabase Production: `torneos-kelme-production` (Free, sa-east-1).
- Supabase Preview: `liga-futbol-preview` / ensayo aislado (no usar en prod).
- Auth.js Credentials/JWT; Supabase Auth y Storage **no** se usan.

### Variables de entorno (Production)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Supavisor Transaction Mode, puerto 6543, `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supavisor Session Mode, puerto 5432 |
| `AUTH_SECRET` | Secreto Auth.js |
| `NEXTAUTH_URL` | `https://torneos-kelme.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable Production |
| `SUPABASE_SECRET_KEY` | Clave secret Production (broadcast Realtime) |
| `CRON_SECRET` | Bearer para `GET /api/health/database` (Vercel Cron, 12:00 UTC) |

Valores reales: gestor de secretos, nunca en Git.

### Builds y migraciones

Vercel: `npm ci` + `npm run build` (genera Prisma Client; **no** ejecuta migraciones).

Migraciones de esquema: manualmente con `DIRECT_URL` de Session Pooler, tras backup pre-release:

```powershell
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

### Health diario

Vercel Cron llama `GET /api/health/database` a las 12:00 UTC con `Authorization: Bearer` usando `CRON_SECRET`.

### Verificar producción

- Landing: https://torneos-kelme.vercel.app
- Ayuda: `/ayuda`
- Live (Kelme): `/kelme/live/demo-match-live`
- Login demo: `demo-admin@demo.torneoskelme.cl` / `password123`

## Ensayo Supabase Preview

Procedimiento de ensayo Neon → Preview (fase 2):

[`docs/operations/supabase-preview-database-rehearsal.md`](operations/supabase-preview-database-rehearsal.md)

Corte operacional, backups y rollback:

[`docs/superpowers/plans/2026-08-03-vercel-supabase-cutover.md`](superpowers/plans/2026-08-03-vercel-supabase-cutover.md)
