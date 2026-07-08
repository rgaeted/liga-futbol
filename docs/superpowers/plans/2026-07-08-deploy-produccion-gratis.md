# Despliegue a producción (hosting gratis) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar Torneos Kelme en internet con un hosting gratuito que soporte el servidor custom con Socket.io y una base de datos PostgreSQL persistente.

**Architecture:** La app usa un servidor Node custom (`server.ts`: Next.js + Socket.io en un solo proceso), por lo que NO sirve un host serverless como Vercel. Se despliega como **Web Service en Render (plan free)**, que mantiene un proceso Node vivo y soporta WebSockets. La base de datos es **PostgreSQL en Neon (free tier permanente)**, compatible con el adaptador `@prisma/adapter-pg` que ya usa el proyecto. El código fuente se aloja en **GitHub**, desde donde Render hace deploy automático en cada push.

**Tech Stack:** Render (web service), Neon (Postgres), GitHub, Next.js 16 + custom server, Prisma 7, Auth.js v5, Socket.io.

---

## Contexto para el implementador

- **Por qué no Vercel:** `server.ts` inicia un `http.createServer` con Socket.io (`src/server/socket.ts`) y usa `global.__socketIo` para emitir eventos en vivo. Esto requiere un proceso único y persistente. Vercel es serverless (sin WebSockets persistentes ni estado global entre invocaciones), así que rompería el marcador en vivo.
- **Elección de host:** Render free web service mantiene un proceso vivo y soporta WebSockets en todos los planes. Contra: el servicio free "duerme" tras 15 min sin tráfico y el primer request luego tarda ~50s (cold start). Es aceptable para demo/pruebas y es gratis de forma permanente.
- **Elección de DB:** Neon free tier es Postgres serverless con free permanente (a diferencia del Postgres de Render, que en free expira a los ~30 días). Neon es accesible desde cualquier IP, lo que permite correr migraciones y seed desde el equipo local.
- **Estado actual del repo:** rama `main`, **sin remoto configurado** (`git remote -v` vacío). Hay cambios sin commitear (traducción a español chileno) que deben entrar antes del deploy.
- **Gotcha de dependencias (crítico):** Render pone `NODE_ENV=production`, y con eso `npm install` **omite `devDependencies`**. Pero el build necesita `typescript`, `tailwindcss`, `prisma`, etc. (que hoy son devDependencies). Solución en el plan: el `buildCommand` usa `npm ci --include=dev`. Además `tsx` se mueve a `dependencies` porque el `startCommand` (`tsx server.ts`) lo necesita en runtime.
- **Gotcha de Auth.js v5 (crítico):** detrás del proxy de Render, Auth.js necesita `trustHost: true` o falla el login. Se agrega en `auth.config.ts`.
- **Socket en producción:** `src/lib/socket-client.ts` hace `io(process.env.NEXT_PUBLIC_SOCKET_URL ?? '')`. Con string vacío, socket.io-client conecta al **mismo origen** (la URL de Render). Como front y back viven en el mismo dominio, NO hace falta setear `NEXT_PUBLIC_SOCKET_URL`. El CORS del server usa `NEXTAUTH_URL`, que apuntará a la URL de Render.
- **Prisma 7:** el generator no define `output`, así que el cliente se genera en la ubicación por defecto. El build corre `npx prisma generate` explícitamente.

---

## Mapa de archivos

```
liga-futbol/
├── src/lib/auth.config.ts        # MODIFICAR — trustHost: true
├── package.json                  # MODIFICAR — tsx a dependencies + engines.node
├── render.yaml                   # CREAR — blueprint de Render (web service free)
├── .env.example                  # MODIFICAR — documentar vars de producción
├── .dockerignore                 # (no aplica — Render usa buildpack Node)
└── docs/DEPLOY.md                # CREAR — guía paso a paso de despliegue
```

---

### Task 1: Habilitar `trustHost` en Auth.js para producción

Detrás del proxy de Render, Auth.js v5 no confía en los headers de host por defecto y el login falla con error de host/URL. `trustHost: true` lo soluciona y es seguro en este contexto (host controlado por la plataforma).

**Files:**
- Modify: `src/lib/auth.config.ts`

- [ ] **Step 1: Agregar `trustHost` a la config compartida**

Reemplazar el contenido de `src/lib/auth.config.ts` por:

```typescript
import type { NextAuthConfig } from 'next-auth'

export default {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as typeof session.user.role
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
```

- [ ] **Step 2: Verificar que compila y los tests siguen pasando**

Run: `npm run test`
Expected: PASS (38 tests, sin errores de tipos por el cambio).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.config.ts
git commit -m "feat: trust host in auth config for production proxy"
```

---

### Task 2: Ajustar `package.json` para runtime de producción

`tsx` es hoy devDependency, pero el `startCommand` de producción (`tsx server.ts`) lo necesita en runtime. Se mueve a `dependencies`. Además se fija la versión de Node con `engines` para que Render use Node 20+.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Mover `tsx` a `dependencies`**

En `package.json`, quitar la línea `"tsx": "^4.20.3",` del bloque `devDependencies` y agregarla al bloque `dependencies` (manteniendo orden alfabético, después de `socket.io-client`). El bloque `dependencies` debe quedar así:

```json
  "dependencies": {
    "@hookform/resolvers": "^5.4.0",
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "bcryptjs": "^3.0.3",
    "date-fns": "^4.4.0",
    "dotenv": "^17.4.2",
    "next": "16.2.9",
    "next-auth": "^5.0.0-beta.31",
    "pg": "^8.22.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.80.0",
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3",
    "tsx": "^4.20.3",
    "zod": "^4.4.3"
  },
```

- [ ] **Step 2: Agregar `engines` con la versión de Node**

En `package.json`, agregar un bloque `engines` justo después de `"private": true,`:

```json
  "engines": {
    "node": ">=20 <23"
  },
```

- [ ] **Step 3: Verificar que el árbol de dependencias sigue consistente**

Run: `npm install`
Expected: actualiza `package-lock.json` sin errores; `tsx` queda listado bajo dependencies.

- [ ] **Step 4: Verificar que build y arranque local siguen funcionando**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: move tsx to dependencies and pin node engine for deploy"
```

---

### Task 3: Crear el blueprint `render.yaml`

Render puede desplegar desde un archivo `render.yaml` (Blueprint), lo que hace el deploy reproducible. Define un web service free con el build y start correctos, y declara las variables de entorno (los secretos se completan en el dashboard).

**Files:**
- Create: `render.yaml`

- [ ] **Step 1: Crear `render.yaml` en la raíz**

Create `render.yaml`:

```yaml
services:
  - type: web
    name: torneos-kelme
    runtime: node
    plan: free
    region: oregon
    branch: main
    buildCommand: npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
    startCommand: npm start
    healthCheckPath: /login
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: AUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        sync: false
```

Notas sobre este blueprint:
- `npm ci --include=dev` fuerza instalar devDependencies (necesarias para `next build`) aunque `NODE_ENV=production`.
- `npx prisma migrate deploy` aplica las migraciones existentes (`prisma/migrations/`) a la base Neon en cada deploy. Es idempotente.
- `healthCheckPath: /login` es una ruta pública que responde 200 sin sesión.
- `DATABASE_URL` y `NEXTAUTH_URL` quedan `sync: false`: se completan a mano en el dashboard (Task 7).
- `AUTH_SECRET` se genera automáticamente con `generateValue: true`.
- `NEXT_PUBLIC_SOCKET_URL` se omite a propósito: el cliente Socket.io conecta al mismo origen.

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "chore: add Render blueprint for free web service deploy"
```

---

### Task 4: Documentar el despliegue y actualizar `.env.example`

**Files:**
- Modify: `.env.example`
- Create: `docs/DEPLOY.md`

- [ ] **Step 1: Actualizar `.env.example` con notas de producción**

Reemplazar el contenido de `.env.example` por:

```env
# Local (desarrollo)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liga_futbol"
AUTH_SECRET="genera-un-secreto-largo-aqui"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# Producción (Render + Neon) — referencia:
#   DATABASE_URL   -> cadena de conexión de Neon con ?sslmode=require
#   AUTH_SECRET    -> generado por Render (o: openssl rand -base64 32)
#   NEXTAUTH_URL   -> https://<tu-servicio>.onrender.com
#   NEXT_PUBLIC_SOCKET_URL -> no es necesario en prod (Socket.io usa el mismo origen)
```

- [ ] **Step 2: Crear la guía `docs/DEPLOY.md`**

Create `docs/DEPLOY.md`:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/DEPLOY.md
git commit -m "docs: add production deploy guide and env reference"
```

---

### Task 5: Publicar el repositorio en GitHub

Sin remoto no hay deploy. Esta tarea deja el código en GitHub. **Requiere acción del usuario** para crear el repo (y autenticación git).

**Files:** ninguno (operación git).

- [ ] **Step 1: Confirmar que el árbol está limpio**

Run: `git status`
Expected: `nothing to commit, working tree clean` (todos los commits de Tasks 1-4 hechos).

- [ ] **Step 2: Crear el repositorio remoto**

El usuario crea un repo vacío en https://github.com/new (nombre `liga-futbol`, sin README ni .gitignore).

- [ ] **Step 3: Agregar el remoto y hacer push**

```bash
git remote add origin https://github.com/<usuario>/liga-futbol.git
git push -u origin main
```

Expected: la rama `main` queda en GitHub con todo el historial.

- [ ] **Step 4: Verificar**

Run: `git remote -v`
Expected: muestra `origin` apuntando a la URL de GitHub (fetch y push).

---

### Task 6: Provisionar la base de datos en Neon

**Files:** ninguno (infraestructura).

- [ ] **Step 1: Crear proyecto en Neon**

En https://neon.tech, crear cuenta y un proyecto nuevo. Elegir una región (p. ej. AWS us-east-1).

- [ ] **Step 2: Obtener la connection string**

Copiar la cadena **pooled** del dashboard. Formato:
`postgresql://usuario:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

- [ ] **Step 3: Aplicar migraciones y seed desde el equipo local**

```bash
# PowerShell
$env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
npx prisma migrate deploy
npx prisma db seed
npm run db:seed:demo
```

Expected: `migrate deploy` reporta la migración `20260623040716_init` aplicada; el seed imprime `Seed OK`.

- [ ] **Step 4: Verificar conexión**

Run: `npx prisma studio` (con el `DATABASE_URL` de Neon en el entorno)
Expected: se ven las tablas con usuarios base y datos demo. Cerrar Studio al confirmar.

---

### Task 7: Desplegar en Render con el blueprint

**Files:** ninguno (infraestructura).

- [ ] **Step 1: Conectar el repo como Blueprint**

En https://render.com: **New > Blueprint**, autorizar GitHub y elegir `liga-futbol`. Render lee `render.yaml` y propone el servicio `torneos-kelme`.

- [ ] **Step 2: Completar variables sensibles**

Antes de aprobar el deploy, setear:
- `DATABASE_URL` = cadena de Neon (Task 6, con `?sslmode=require`)
- `NEXTAUTH_URL` = `https://torneos-kelme.onrender.com` (ajustar si Render asigna otro nombre)

`AUTH_SECRET` se genera solo (blueprint). `NODE_ENV` ya viene en `production`.

- [ ] **Step 3: Lanzar el deploy y seguir los logs**

Aprobar. En los logs del build debe verse: `npm ci`, `prisma generate`, `prisma migrate deploy` (sin nuevas migraciones pendientes porque ya se aplicaron en Task 6), y `next build` exitoso. Luego el servicio arranca con `> Ready on http://localhost:PORT`.

Expected: estado del servicio **Live**.

- [ ] **Step 4: Verificar que la URL responde**

Abrir `https://torneos-kelme.onrender.com/login`.
Expected: carga la pantalla de login (HTTP 200).

---

### Task 8: Verificación end-to-end en producción

**Files:** ninguno (validación).

- [ ] **Step 1: Landing pública**

Abrir `https://torneos-kelme.onrender.com/` en una ventana de incógnito.
Expected: se ve la landing de Torneos Kelme y, si hay partido demo en vivo, la sección "Partidos en vivo".

- [ ] **Step 2: Login por rol**

Iniciar sesión con `admin@liga.com` / `password123`.
Expected: redirige a `/admin` y el CRUD de equipos/jugadores/temporadas/partidos/usuarios funciona.

- [ ] **Step 3: Marcador en vivo (WebSocket)**

En una pestaña abrir `https://torneos-kelme.onrender.com/live/demo-match-live`.
En otra, entrar como árbitro (`demo-arbitro@demo.torneoskelme.cl` / `password123`), abrir su partido y registrar un gol.
Expected: el marcador de la primera pestaña se actualiza sin recargar (confirma que Socket.io funciona en producción).

- [ ] **Step 4: Confirmar deploy automático**

Hacer un cambio menor (p. ej. un texto), commit y `git push origin main`.
Expected: Render dispara un nuevo deploy automáticamente y, al terminar, el cambio se ve en la URL.

---

## Pendientes / mejoras futuras (fuera de este plan)

- **Dominio propio:** conectar un dominio custom en Render (gratis) en vez de `*.onrender.com`.
- **Evitar cold start:** un cron externo (p. ej. cron-job.org) que haga ping cada 10 min mantiene el servicio despierto; o migrar a un plan pago.
- **Alternativas de host:** si Render no convence, Koyeb y Fly.io también soportan proceso persistente + WebSockets en free tier (mismo `render.yaml` no aplica; requerirían Dockerfile).
- **Backups de DB:** Neon free incluye branching/PITR limitado; documentar política de respaldo si el torneo pasa a uso real.

---

## Self-Review

**1. Spec coverage (requisito = "subir esto a producción a algún sitio gratis"):**

| Requisito | Task |
|-----------|------|
| Hosting gratis compatible con custom server + Socket.io | Render free web service (Tasks 3, 7) |
| Base de datos gratis persistente | Neon (Task 6) |
| Código en repositorio para deploy | GitHub (Task 5) |
| Ajustes de código para prod (auth proxy, runtime deps) | Tasks 1, 2 |
| Reproducibilidad del deploy | `render.yaml` (Task 3) |
| Migraciones + datos iniciales en prod | Task 6 |
| Guía y variables documentadas | Task 4 |
| Validación de que todo funciona (incl. WebSocket) | Task 8 |

**2. Placeholder scan:** sin TBD/TODO. Todos los archivos con contenido completo; comandos con salida esperada. Los pasos de infraestructura (Neon/Render/GitHub) incluyen acciones concretas de UI y comandos exactos, ya que no son automatizables desde el repo.

**3. Type/consistency:** `NEXTAUTH_URL` se usa igual en `src/server/socket.ts` (CORS) y en el blueprint/guía. `DATABASE_URL` con `?sslmode=require` es consistente entre Task 6 y `render.yaml`. El `startCommand` (`npm start` → `tsx server.ts`) depende de `tsx` en `dependencies` (Task 2). El `buildCommand` usa `--include=dev` para cubrir el gotcha de `NODE_ENV=production`. `trustHost: true` (Task 1) queda dentro del objeto que ya se hace spread en `src/lib/auth.ts` vía `authConfig`.
```
