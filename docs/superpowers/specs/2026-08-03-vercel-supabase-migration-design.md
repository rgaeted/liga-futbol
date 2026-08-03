# Migración a Vercel y Supabase — Design Spec

> Estado: **Diseño aprobado**
> Fecha: 2026-08-03
> Producción actual: Render + Neon
> Producción objetivo: Vercel + Supabase Postgres + Supabase Realtime

---

## 1. Objetivo

Migrar Torneos Kelme desde Render y Neon hacia Vercel y Supabase conservando todos los datos, las cuentas, los roles y el comportamiento funcional actual.

La migración debe:

- eliminar el cold start y los problemas de streaming observados en Render;
- mantener Prisma 7 y Auth.js;
- reemplazar el servidor Socket.IO en memoria por Supabase Realtime;
- preservar los datos PostgreSQL, incluido el historial Prisma y las imágenes `BYTEA`;
- permitir un ensayo completo antes del corte;
- ofrecer rollback claro sin producir dos fuentes de verdad.

---

## 2. Alcance

### Incluido

- Hosting Next.js 16 en Vercel.
- PostgreSQL en Supabase.
- Prisma 7 con Supavisor.
- Auth.js Credentials y JWT actuales.
- Supabase Realtime Broadcast.
- Migración íntegra de datos desde Neon.
- Configuración de Preview y Production.
- Ventana breve de mantenimiento para el corte.
- Retención temporal de Render y Neon para rollback.
- Actualización de documentación de despliegue.
- Renombrado de `middleware.ts` a `proxy.ts` según la convención de Next.js 16.

### Excluido

- Supabase Auth.
- Supabase Storage.
- Cambio de contraseñas o roles.
- Rediseño visual.
- Dominio propio en la primera salida.
- Cambios funcionales ajenos a hosting, persistencia o tiempo real.

Las imágenes seguirán almacenadas en PostgreSQL. El límite actual de 500 KB está bajo el límite de payload de 4,5 MB de Vercel.

---

## 3. Estado actual

### Hosting

- `server.ts` crea un servidor HTTP persistente, monta Next.js e inicializa Socket.IO.
- `package.json` usa `tsx server.ts` para `dev` y `start`.
- `render.yaml` ejecuta migraciones, build y el servidor custom.

### Base de datos

- Prisma 7.8 con `@prisma/adapter-pg` y `pg.Pool`.
- 20 migraciones en `prisma/migrations/`.
- `DATABASE_URL` se usa en runtime.
- `DIRECT_URL` se usa para Prisma CLI y migraciones.
- No hay SQL raw en el runtime de la aplicación.
- Cinco columnas `BYTEA` almacenan fotos y escudos.

### Tiempo real

- `src/server/socket.ts` guarda `global.__socketIo`.
- Los espectadores se unen a `match:<matchId>`.
- Cinco rutas de código producen seis emisiones:
  - creación de eventos;
  - reconciliación de eventos editados o eliminados;
  - asignación de MVP;
  - carga y eliminación de foto MVP.
- `LiveScoreboard` mezcla el payload recibido en estado local.
- No existe resync completo tras reconexión ni fallback por polling.

### Autenticación

- Auth.js v5 beta con Credentials.
- Sesiones JWT.
- Roles en el token y la sesión.
- `trustHost: true`.
- Las rutas live son públicas.

---

## 4. Arquitectura objetivo

```text
Navegador
  ├─ Next.js en Vercel
  │    ├─ páginas RSC
  │    ├─ Route Handlers
  │    ├─ Auth.js
  │    └─ Prisma
  ├─ GET /api/matches/:id/live
  └─ Supabase Realtime (suscripción pública)

Vercel Route Handler
  ├─ escritura Prisma → Supabase Postgres
  └─ POST Realtime REST API → evento invalidate

Supabase
  ├─ Postgres vía Supavisor
  └─ Realtime Broadcast
```

### Decisiones

1. Vercel usará el adaptador estándar de Next.js; `server.ts` se elimina.
2. Auth.js permanece como única capa de autenticación de la app.
3. Supabase se usa para PostgreSQL y Realtime, no para Auth ni Storage.
4. Realtime funciona como señal de invalidación, no como fuente de datos.
5. El estado live canónico siempre se reconstruye desde PostgreSQL.
6. Las migraciones no se ejecutan automáticamente en cada build de Vercel.
7. Vercel y Supabase se crearán en regiones cercanas, preferentemente São Paulo.

---

## 5. Conexiones Prisma

### Runtime Vercel

`DATABASE_URL` debe usar Supavisor Transaction Mode:

```text
postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Prisma CLI

`DIRECT_URL` debe usar Supavisor Session Mode:

```text
postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres
```

### Reglas

- El runtime nunca usa la conexión directa.
- `prisma migrate deploy`, `prisma migrate status`, `pg_dump` y `psql` usan Session Mode o conexión directa.
- `prisma.config.ts` debe exigir `DIRECT_URL` para comandos destructivos o migraciones; se elimina el reemplazo específico de hostname Neon.
- El pool de `src/lib/db.ts` debe limitar conexiones para funciones serverless.
- Prisma Client se genera en instalación/build, pero las migraciones son un paso de release manual y auditado.

---

## 6. Estado live canónico

La consulta y serialización que hoy viven en `src/app/live/[matchId]/page.tsx` se extraerán a un módulo compartido.

### Interfaz

```typescript
export async function getLiveMatchSnapshot(matchId: string): Promise<LiveMatchSnapshot | null>
```

`LiveMatchSnapshot` contiene exactamente los datos públicos que consume `LiveScoreboard`:

- equipos, colores y escudos;
- marcador y estado;
- reloj;
- cronología con nombres y asistencias;
- formaciones;
- capitán y DT;
- MVP;
- ubicación y clima.

### Consumidores

- `src/app/live/[matchId]/page.tsx`: carga SSR inicial.
- `GET /api/matches/[id]/live`: resync y polling.

La API responde:

- `200` con snapshot;
- `404` si el partido no existe;
- `500` JSON genérico y log estructurado si Prisma falla.

La ruta será pública en `proxy.ts`, igual que la página live.

---

## 7. Supabase Realtime

### Publicación

Nuevo módulo de servidor:

```typescript
export async function publishMatchInvalidation(matchId: string): Promise<void>
```

Comportamiento:

1. valida que `matchId` no esté vacío;
2. usa `NEXT_PUBLIC_SUPABASE_URL`;
3. llama a Realtime REST API con `SUPABASE_SECRET_KEY`;
4. publica en topic `match:<matchId>`;
5. usa evento `invalidate`;
6. envía solo `{ matchId }`;
7. registra errores sin imprimir secretos.

La escritura principal no se revierte si Realtime falla. La función productora debe guardar el partido primero, intentar publicar y devolver éxito aunque la notificación falle.

### Suscripción cliente

Nuevo hook:

```typescript
export function useMatchRealtime(options: {
  matchId: string
  enabled: boolean
  onInvalidate: () => void
}): MatchRealtimeStatus
```

`MatchRealtimeStatus`:

```typescript
type MatchRealtimeStatus = 'connecting' | 'connected' | 'degraded'
```

El hook:

- usa `NEXT_PUBLIC_SUPABASE_URL`;
- usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- se suscribe al canal público `match:<matchId>`;
- escucha `invalidate`;
- desuscribe el canal al desmontar;
- cambia a `degraded` ante error, timeout o cierre.

### Resync

`LiveScoreboard` no aplica el payload del broadcast. En su lugar:

1. recibe `invalidate`;
2. agrupa eventos simultáneos con debounce;
3. consulta `GET /api/matches/[id]/live`;
4. reemplaza el estado completo;
5. conserva el último estado válido si el fetch falla.

Mientras el estado sea `LIVE` o `HALFTIME`, un polling visible de respaldo consultará el snapshot con intervalo moderado. Al recuperar conexión se ejecuta un resync inmediato.

### Seguridad

- La clave secreta existe solo en Vercel Server.
- El navegador recibe únicamente la clave publicable.
- El live ya es público, por lo que el canal también puede ser público.
- Un cliente no confiable solo puede provocar invalidaciones.
- La invalidación se limita con debounce y no contiene datos de negocio.
- El marcador mostrado siempre proviene de la API canónica.

---

## 8. Emisores que deben migrar

Se reemplaza `emitMatchUpdate` por `await publishMatchInvalidation(matchId)` después de completar cada escritura:

- `src/lib/match-events.ts`;
- `src/lib/match-reconcile.ts`;
- `src/app/api/matches/[id]/mvp/route.ts`;
- `src/app/api/matches/[id]/mvp/[side]/photo/route.ts`.

Como el cliente recarga el snapshot completo:

- las ediciones y eliminaciones de cronología quedan sincronizadas;
- ya no se necesita enviar relaciones Prisma serializadas;
- desaparece la duplicación de `LiveMatchPayload`;
- no se necesita una migración SQL de Realtime;
- el mismo código puede probarse antes de retirar Render.

---

## 9. Configuración Vercel

### Proyecto

- Framework Preset: Next.js.
- Root Directory: repositorio raíz.
- Node.js: 20.x.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Región: cercana al proyecto Supabase.

### Variables

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
```

`NEXTAUTH_URL` usa inicialmente la URL gratuita de producción de Vercel.

### Scripts

- `dev`: `next dev`.
- `build`: genera Prisma Client y ejecuta `next build`.
- `start`: `next start`, solo para ejecución local o fallback.
- Se eliminan `socket.io`, `socket.io-client` y el uso runtime de `tsx` cuando no queden consumidores.

### Proxy Next.js

`src/middleware.ts` se renombra a `src/proxy.ts` y exporta `proxy`, conservando:

- rutas públicas;
- 401 JSON para APIs;
- callback de login;
- RBAC por área.

Además incorpora dos controles usados solo durante el corte:

- `MIGRATION_MAINTENANCE_MODE=true`: las mutaciones responden `503` JSON y las páginas privadas muestran `/mantenimiento`; las lecturas públicas permanecen disponibles.
- `MIGRATION_REDIRECT_URL=https://<proyecto>.vercel.app`: después del corte, las navegaciones GET recibidas por Render se redirigen al sitio nuevo.

`src/app/mantenimiento/page.tsx` será una página pública simple en español chileno. Ninguna de estas variables se activa en Vercel.

---

## 10. Migración de datos

### Ensayo

1. Crear el proyecto Supabase.
2. Obtener Session Pooler y Transaction Pooler.
3. Exportar Neon con la guía oficial:

```bash
pg_dump "$NEON_DIRECT_URL" \
  --clean \
  --if-exists \
  --schema=public \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  > dump.sql
```

4. Restaurar usando Supabase Session Pooler:

```bash
psql -d "$SUPABASE_SESSION_URL" \
  --variable ON_ERROR_STOP=1 \
  -f dump.sql
```

5. Ejecutar `prisma migrate status`.
6. Conectar Vercel Preview a esta copia.
7. Ejecutar pruebas funcionales por rol.

El dump completo preserva:

- enums;
- tablas;
- claves foráneas;
- datos;
- `BYTEA`;
- `_prisma_migrations`.

No se ejecutarán nuevamente las migraciones históricas sobre el dump restaurado.

### Verificación de datos

Un script comparará Neon y Supabase:

- listado y conteo de tablas;
- 20 filas de `_prisma_migrations`;
- conteos de modelos principales;
- IDs y emails de usuarios;
- partidos por estado y tipo;
- eventos por tipo;
- relaciones huérfanas;
- cantidad y suma de bytes de fotos y escudos.

El ensayo se rechaza ante cualquier diferencia no explicada.

---

## 11. Corte a producción

### Precondiciones

- Preview Vercel aprobado.
- Suite, typecheck y build en verde.
- Ensayo de dump/restore repetible.
- Realtime validado con dos navegadores.
- Vercel Production configurado, pero URL aún no publicada.
- Neon y Render respaldados.

### Secuencia

1. Anunciar ventana de mantenimiento.
2. Activar modo mantenimiento en Render para impedir nuevas mutaciones.
3. Confirmar que no haya partidos `LIVE` o `HALFTIME`.
4. Crear dump final desde Neon.
5. Restaurar el dump final en Supabase limpio.
6. Ejecutar verificaciones automáticas.
7. Ejecutar `prisma migrate status` contra Supabase.
8. Desplegar Vercel Production con variables definitivas.
9. Probar login y cada panel.
10. Probar una mutación controlada.
11. Probar actualización live entre árbitro y espectador.
12. Publicar la URL de Vercel.
13. Redirigir o informar desde la URL Render.
14. Mantener Render y Neon durante siete días.

No se permite cortar mientras exista un partido en vivo.

---

## 12. Rollback

### Antes de publicar Vercel

- Desactivar mantenimiento.
- Continuar con Render y Neon.
- Corregir el entorno nuevo y repetir el corte.

### Después de publicar, sin escrituras nuevas

- Volver temporalmente a Render/Neon.
- Retirar la URL Vercel.

### Después de escrituras en Supabase

Supabase sigue siendo la fuente de verdad.

- No se vuelve a Neon.
- Si Vercel falla, se despliega temporalmente la misma versión compatible en Render apuntando a Supabase.
- Neon permanece solo como respaldo histórico.
- Cualquier retorno a Neon requiere una nueva migración controlada desde Supabase.

---

## 13. Errores y degradación

### PostgreSQL

- Pool agotado: responder error controlado y registrar métricas.
- Migración pendiente: bloquear el corte.
- Diferencias de datos: abortar restore/cutover.

### Realtime

- Falta configuración en desarrollo: estado `degraded`, sin crash.
- Publicación REST falla: log server-side y operación principal exitosa.
- Suscripción falla: polling de respaldo.
- Snapshot falla: conservar último estado y reintentar.

### Auth

- Se conserva `AUTH_SECRET` para mantener firmas compatibles.
- `NEXTAUTH_URL` cambia a Vercel al corte.
- `trustHost: true` se mantiene.
- Se acepta que el cambio de dominio requiera una nueva cookie y login.

---

## 14. Estrategia de pruebas

### Unitarias

- Configuración Supabase requerida.
- Construcción de URL/topic Realtime.
- Publicación exitosa y error degradado.
- Debounce de invalidaciones.
- Constructor de snapshot live.
- Suscripción y cleanup del hook.
- Conservación del último snapshot ante error.

### API

- Snapshot público retorna `200`.
- Partido inexistente retorna `404`.
- Error Prisma retorna `500` sin detalles internos.
- Rutas protegidas siguen exigiendo rol.

### Integración

- Base Supabase de ensayo con migraciones y datos.
- Login Credentials contra Supabase.
- Lectura y escritura Prisma por Transaction Pooler.
- Upload y lectura de imágenes `BYTEA`.
- Publicación REST y recepción Realtime.

### Manuales

- Admin: dashboard y CRUD principal.
- Árbitro: inicio, evento, entretiempo y final.
- Jugador y DT: accesos y formaciones.
- Live: marcador, cronología, reloj y MVP.
- Dos navegadores en redes o sesiones distintas.
- Preview y Production.

### Comandos de aceptación

```bash
npx vitest run
npx tsc --noEmit
npm run build
npx prisma migrate status
```

---

## 15. Mapa de archivos

### Crear

- `src/lib/live-match-snapshot.ts`: consulta y DTO canónico.
- `src/lib/supabase-realtime-server.ts`: publicación REST.
- `src/lib/supabase-realtime-client.ts`: cliente browser.
- `src/hooks/useMatchRealtime.ts`: ciclo de suscripción.
- `src/app/api/matches/[id]/live/route.ts`: snapshot público.
- `src/app/mantenimiento/page.tsx`: aviso durante el corte.
- `tests/lib/live-match-snapshot.test.ts`.
- `tests/lib/supabase-realtime-server.test.ts`.
- `tests/hooks/use-match-realtime.test.tsx`.
- `tests/api/live-match-snapshot.test.ts`.
- `scripts/verify-database-migration.ts`.
- `docs/operations/vercel-supabase-cutover.md`.

### Modificar

- `src/app/live/[matchId]/page.tsx`.
- `src/components/live/LiveScoreboard.tsx`.
- `src/lib/match-events.ts`.
- `src/lib/match-reconcile.ts`.
- `src/app/api/matches/[id]/mvp/route.ts`.
- `src/app/api/matches/[id]/mvp/[side]/photo/route.ts`.
- `src/lib/db.ts`.
- `prisma.config.ts`.
- `package.json`.
- `package-lock.json`.
- `.env.example`.
- `README.md`.
- `docs/DEPLOY.md`.
- `docs/handoff/SESSION-CONTEXT.md` después del corte.

### Renombrar

- `src/middleware.ts` → `src/proxy.ts`.

### Eliminar cuando el reemplazo esté validado

- `server.ts`.
- `src/server/socket.ts`.
- `src/lib/socket-client.ts`.
- `render.yaml`, después del periodo de rollback.

---

## 16. Fases independientes

La migración se divide en tres planes ejecutables y revisables:

1. **Realtime y compatibilidad Vercel**
   - snapshot canónico;
   - Broadcast;
   - cliente live;
   - eliminación de Socket.IO y custom server;
   - proxy Next.js 16.

2. **Supabase Postgres y validación**
   - conexiones Prisma;
   - proyecto Supabase;
   - dump/restore de ensayo;
   - verificación automatizada;
   - documentación de datos.

3. **Vercel, corte y retiro**
   - proyecto Vercel;
   - variables;
   - Preview;
   - mantenimiento;
   - dump final;
   - smoke tests;
   - rollback y retiro de Render/Neon.

Cada plan debe dejar software verificable por separado. La producción actual no se altera durante los dos primeros planes.

---

## 17. Criterios de éxito

- Todos los datos de Neon están en Supabase sin diferencias.
- Las 20 migraciones Prisma figuran aplicadas.
- Auth.js conserva cuentas, hashes y roles.
- Vercel sirve todas las rutas sin servidor custom.
- El árbitro actualiza el live sin recarga manual.
- Una desconexión Realtime converge mediante resync o polling.
- Fotos y escudos cargan correctamente.
- No hay claves secretas en el bundle cliente.
- Suite, typecheck y build pasan.
- El corte se completa dentro de la ventana anunciada.
- Render y Neon pueden retirarse después de siete días estables.

