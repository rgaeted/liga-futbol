# Torneos Kelme — Liga Fútbol

Aplicación web multi-rol para gestionar una liga de fútbol de marca: administración de equipos y partidos, citaciones y evaluaciones del DT, control en vivo del árbitro y marcador público.

## Requisitos

- Node.js 20+
- PostgreSQL (Docker recomendado)

## Configuración

1. Copia las variables de entorno:

```bash
cp .env.example .env
```

2. Levanta PostgreSQL (puerto **5433** en el ejemplo):

```bash
docker run -d --name liga-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=liga_futbol -p 5433:5432 postgres:16
```

3. Instala dependencias y aplica el schema:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

El seed base crea usuarios mínimos para cada rol (password: `password123`):

| Rol     | Email              |
|---------|--------------------|
| Admin   | admin@liga.com     |
| DT      | dt@liga.com        |
| Jugador | jugador@liga.com   |
| Árbitro | arbitro@liga.com   |

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El servidor usa Next.js + Socket.io (`server.ts`).

```bash
npm run test    # tests
npm run lint    # ESLint
npm run build   # build de producción
```

## Datos demo (pruebas)

Para probar todas las funcionalidades con un escenario completo y borrable:

```bash
npm run db:seed:demo   # cargar datos de ejemplo
npm run db:clear:demo  # eliminar solo datos demo
```

Los datos demo se identifican por IDs con prefijo `demo-` y emails `@demo.torneoskelme.cl`. **No afectan** a los usuarios base (`admin@liga.com`, etc.).

### Contenido del dataset demo

| Área          | Detalle                                              |
|---------------|------------------------------------------------------|
| Equipos       | Kelme Norte FC, Kelme Sur FC (8 jugadores c/u)       |
| Temporada     | Torneos Kelme 2026 (activa)                          |
| Partidos      | Finalizado, en vivo y programado                     |
| Citaciones    | Convocatorias para los 3 partidos                    |
| Evaluaciones  | Notas del DT sobre jugadores                         |
| Eventos       | Goles, tarjetas, tiros, etc.                         |

### Credenciales demo (password: `password123`)

| Rol     | Email                                  |
|---------|----------------------------------------|
| Admin   | demo-admin@demo.torneoskelme.cl        |
| DT Norte| demo-dt-norte@demo.torneoskelme.cl     |
| DT Sur  | demo-dt-sur@demo.torneoskelme.cl       |
| Árbitro | demo-arbitro@demo.torneoskelme.cl      |
| Jugador | demo-norte-10@demo.torneoskelme.cl     |

### Rutas útiles con datos demo

| Escenario   | URL / acción                                      |
|-------------|---------------------------------------------------|
| Marcador    | `/live/demo-match-finished` (finalizado)          |
| En vivo     | `/live/demo-match-live`                           |
| Citaciones  | `/coach` (iniciar sesión como DT Norte o Sur)     |
| Árbitro     | `/referee` (iniciar sesión como árbitro demo)     |
| Admin       | `/admin` (equipos, jugadores, temporadas, partidos)|

### Archivos

- `prisma/seed-demo.ts` — carga de datos demo
- `prisma/clear-demo.ts` — limpieza selectiva
- `prisma/lib/db-client.ts` — cliente Prisma y constantes demo

## Roles

- **Admin** — CRUD equipos, jugadores, temporadas y partidos
- **Jugador** — dashboard, partidos y estadísticas
- **DT (Coach)** — citaciones y evaluaciones
- **Árbitro** — control de partido en vivo
- **Público** — marcador en `/live/[matchId]` (sin login)
