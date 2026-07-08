# Despliegue en producción (gratis)

Stack: **Render** (web service free) + **Neon** (Postgres free) + **GitHub**.

## 1. Base de datos en Neon

1. Crea una cuenta en https://neon.tech (login con GitHub).
2. Crea un proyecto (región cercana, p. ej. AWS us-west / us-east).
3. Copia la **connection string** (pooled) del dashboard. Debe verse así:
   `postgresql://usuario:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
4. Guárdala: es tu `DATABASE_URL` de producción.

## 2. Migrar y sembrar datos (desde tu equipo)

Neon es accesible desde cualquier IP, así que corres esto localmente apuntando a Neon:

```bash
# Reemplaza por tu cadena de Neon
$env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"   # PowerShell

npx prisma migrate deploy   # crea las tablas
npx prisma db seed          # usuarios base (admin@liga.com, etc.)
npm run db:seed:demo        # datos demo (opcional)
```

## 3. Subir el código a GitHub

Si el repo aún no está en GitHub, crea uno vacío en https://github.com/new
(sin README) y luego:

```bash
git remote add origin https://github.com/<usuario>/liga-futbol.git
git push -u origin main
```

## 4. Desplegar en Render

1. Crea cuenta en https://render.com (login con GitHub).
2. **New > Blueprint** y selecciona el repo `liga-futbol`. Render detecta `render.yaml`.
3. Render creará el web service `torneos-kelme`. Antes del primer deploy, completa
   las variables marcadas como *sync: false*:
   - `DATABASE_URL` = la cadena de Neon (con `?sslmode=require`)
   - `NEXTAUTH_URL` = `https://torneos-kelme.onrender.com`
     (usa el nombre real que muestre Render si difiere)
4. Lanza el deploy. El build corre migraciones + `next build` y luego `npm start`.

## 5. Verificar

- Abre `https://torneos-kelme.onrender.com` → landing pública.
- Inicia sesión con `admin@liga.com` / `password123`.
- Abre `https://torneos-kelme.onrender.com/live/demo-match-live` → marcador en vivo.
- Como árbitro, registra un evento y confirma que el marcador se actualiza en vivo
  (WebSocket).

## Notas

- **Cold start:** el plan free duerme tras 15 min sin tráfico; el primer request
  luego tarda ~50s. Es normal.
- **Deploy automático:** cada `git push` a `main` redepliega.
- **Cambios de esquema:** crea la migración local (`npx prisma migrate dev`),
  commitea `prisma/migrations/` y haz push; Render aplica `migrate deploy` en el build.
