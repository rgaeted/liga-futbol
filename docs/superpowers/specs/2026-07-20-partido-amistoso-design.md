# Partido amistoso — Design Spec

> Estado: **Pendiente de revisión del usuario**  
> Fecha: 2026-07-20  
> Decisiones previas: lados libres (A), perfiles admin + reclamación opcional (C), pago por jugador/partido (A), solo admin marca pago en cualquier momento (C), stats separadas (C), live público igual que liga (A), enfoque Match tipado (1).

---

## 1. Objetivo

Agregar **partidos amistosos** a Torneos Kelme: partidos fuera de la liga, con planteles armados desde un pool de jugadores (nombre + apellido), panel de árbitro reutilizado, marcador en vivo público, y control admin de **si cada jugador pagó o no** ese partido.

---

## 2. Alcance

### Incluye

- Pool reutilizable de jugadores amistosos (`FriendlyPlayer`)
- Crear/editar amistosos con lados libres (nombre lado A / lado B) y planteles
- Campo `paid` por jugador y por partido (solo admin)
- Árbitro: mismos eventos que hoy, sobre el plantel del amistoso
- Live público `/live/[matchId]` para amistosos
- Stats de amistosos **separadas** (agregadas desde eventos; no tocan contadores de liga)
- Reclamación opcional de perfil: registro con cuenta vinculada a un `FriendlyPlayer` sin `userId`

### Fuera de alcance

- Pasarela de pago / cobro online
- Citaciones de coach y evaluaciones de DT en amistosos
- Mezclar goles/tarjetas de amistosos con `Player.goals` / tabla de liga
- App móvil nativa
- Roles nuevos (no se crea `FRIENDLY_PLAYER`)

---

## 3. Arquitectura

Se extiende el `Match` existente con `matchType: LEAGUE | FRIENDLY` (default `LEAGUE`).

- **Liga:** comportamiento actual (temporada + 2 equipos obligatorios).
- **Amistoso:** sin temporada ni equipos de liga; dos lados con nombre libre; plantel vía `FriendlyMatchPlayer`.

Se reutilizan: status del partido, `MatchEvent` + `registerMatchEvent`, panel del árbitro, sockets, live scoreboard.

```text
Admin
  ├─ CRUD FriendlyPlayer (pool)
  ├─ Crear Match FRIENDLY + FriendlyMatchPlayer[]
  └─ Toggle paid por participación

Referee
  └─ MatchControlPanel → eventos con friendlyPlayerId

Público
  └─ /live/[matchId] (lados A/B + nombres FriendlyPlayer)

Jugador (opcional)
  └─ Registro → reclama FriendlyPlayer sin userId
       → User (PLAYER) + Player (teamId null) + FriendlyPlayer.userId
```

---

## 4. Modelo de datos

### 4.1 Enums nuevos

```prisma
enum MatchType {
  LEAGUE
  FRIENDLY
}

enum FriendlySide {
  A
  B
}
```

### 4.2 `Match` (cambios)

| Campo | Cambio |
|-------|--------|
| `matchType` | Nuevo, default `LEAGUE` |
| `seasonId` | Pasa a **opcional** |
| `homeTeamId` | Pasa a **opcional** |
| `awayTeamId` | Pasa a **opcional** |
| `sideAName` | Nuevo, `String?` — obligatorio si `FRIENDLY` |
| `sideBName` | Nuevo, `String?` — obligatorio si `FRIENDLY` |
| `friendlyPlayers` | Relación `FriendlyMatchPlayer[]` |

**Invariantes (app + Zod, no solo DB):**

- `LEAGUE` → `seasonId`, `homeTeamId`, `awayTeamId` requeridos; `sideAName`/`sideBName` null; sin filas `FriendlyMatchPlayer`.
- `FRIENDLY` → `sideAName`, `sideBName` requeridos; `seasonId`/`homeTeamId`/`awayTeamId` null; al menos 1 jugador por lado.

**Scores:** en amistosos, `homeScore` = lado A, `awayScore` = lado B (mismo campo, semántica de lados).

### 4.3 `FriendlyPlayer`

```prisma
model FriendlyPlayer {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  userId      String?  @unique
  user        User?    @relation(fields: [userId], references: [id])
  participations FriendlyMatchPlayer[]
  matchEvents MatchEvent[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- Creado por admin con nombre + apellido.
- `userId` null hasta vinculación (admin al crear cuenta, o reclamación).

### 4.4 `FriendlyMatchPlayer`

```prisma
model FriendlyMatchPlayer {
  id               String       @id @default(cuid())
  matchId          String
  match            Match        @relation(...)
  friendlyPlayerId String
  friendlyPlayer   FriendlyPlayer @relation(...)
  side             FriendlySide
  paid             Boolean      @default(false)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@unique([matchId, friendlyPlayerId])
}
```

### 4.5 `MatchEvent` (cambios)

| Campo | Cambio |
|-------|--------|
| `friendlyPlayerId` | Nuevo, opcional |
| `side` | Nuevo, `FriendlySide?` — en amistosos indica a qué lado aplica el evento (goles, etc.) |
| `teamId` / `playerId` | Siguen para liga; en amistosos quedan null |

**Invariantes:**

- Partido `LEAGUE`: eventos usan `playerId`/`teamId` como hoy; `friendlyPlayerId` y `side` null.
- Partido `FRIENDLY`: eventos de jugador (gol, tarjeta, etc.) requieren `friendlyPlayerId` + `side`; `playerId`/`teamId` null.
- Eventos de partido sin jugador (`KICKOFF`, `HALFTIME`, `FULLTIME`): sin `friendlyPlayerId`.

### 4.6 `User`

Relación opcional `friendlyPlayer FriendlyPlayer?`.

Al vincular cuenta: rol `PLAYER`, se crea también `Player` con `teamId` null (compatible con dashboards actuales). Las stats de liga de ese `Player` no se incrementan por amistosos.

---

## 5. APIs

Patrón existente: REST + `requireRole` + Zod.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET/POST | `/api/friendly-players` | ADMIN | Listar / crear pool |
| PUT/DELETE | `/api/friendly-players/[id]` | ADMIN | Editar / borrar (DELETE bloqueado si tiene participaciones) |
| POST | `/api/matches` | ADMIN | Extender body: si `matchType: FRIENDLY`, payload de lados + jugadores |
| PUT | `/api/matches/[id]` | ADMIN | Incluye actualizar plantel amistoso si aplica |
| PATCH | `/api/matches/[id]/friendly-players/[participationId]/paid` | ADMIN | `{ paid: boolean }` |
| POST | `/api/matches/[id]/events` | REFEREE/ADMIN | Extender para `friendlyPlayerId` + `side` en amistosos |
| POST | `/api/friendly-players/claim` | autenticado o flujo registro | Vincular `userId` a un `FriendlyPlayer` libre |
| GET | `/api/friendly-players/[id]/stats` | ADMIN o dueño | Agregados goles/tarjetas en amistosos |

Creación de amistoso (shape conceptual):

```ts
{
  matchType: 'FRIENDLY',
  sideAName: string,
  sideBName: string,
  scheduledAt: string, // ISO
  venue?: string,
  refereeId?: string,
  players: { friendlyPlayerId: string, side: 'A' | 'B' }[]
}
```

---

## 6. UI

### Admin

- **`/admin/friendly-players`**: tabla + form crear/editar (nombre, apellido; opcional email/password para dejar cuenta lista y vincular).
- **`/admin/matches`**: selector de tipo Liga / Amistoso.
  - Liga: form actual.
  - Amistoso: lados A/B, multi-select del pool por lado, árbitro, fecha, cancha.
- Detalle/acciones del partido amistoso: lista de participantes con toggle **Pagó / No pagó**.
- Nav admin: entrada “Jugadores amistosos”.

### Árbitro

- Lista incluye amistosos asignados (título = `sideAName vs sideBName`).
- `MatchControlPanel`: roster desde `FriendlyMatchPlayer` agrupado por lado; POST con `friendlyPlayerId` + `side`.
- Sin UI de pagos.

### Live

- Mismos componentes; labels de equipos = `sideAName` / `sideBName`.
- Eventos muestran `firstName lastName` del `FriendlyPlayer`.

### Registro / reclamación

1. Admin crea `FriendlyPlayer` (sin cuenta).
2. Página o paso de registro: email, contraseña, y **selección de un perfil amistoso sin reclamar** (lista admin-curada; no matching fuzzy por nombre).
3. Transacción: crear `User` (PLAYER) + `Player` (sin equipo) + set `FriendlyPlayer.userId`.
4. Si el admin crea cuenta al mismo tiempo que el perfil, salta el paso 2–3 y deja `userId` ya seteado.
5. Perfil ya vinculado → 409.

---

## 7. Lógica de eventos y stats

- `registerMatchEvent` bifurca por `match.matchType`:
  - `LEAGUE`: lógica actual (incrementa `Player.goals` / tarjetas).
  - `FRIENDLY`: escribe `friendlyPlayerId` + `side`; actualiza `homeScore`/`awayScore` según lado; **no** toca `Player.*`.
- Stats amistosas: `COUNT` / groupBy de `MatchEvent` donde `type` relevante y `friendlyPlayerId` set, join a `Match` con `matchType = FRIENDLY`.

---

## 8. Permisos (resumen)

| Acción | Quién |
|--------|-------|
| CRUD pool + amistosos + `paid` | ADMIN |
| Eventos en vivo | REFEREE asignado o ADMIN |
| Reclamar perfil libre | Usuario en flujo de registro (o ADMIN vinculando) |
| Ver live | Público |

---

## 9. Errores esperados

| Caso | Respuesta |
|------|-----------|
| Amistoso sin ≥1 jugador por lado | 400 |
| Mismo jugador en ambos lados | 400 |
| Evento amistoso sin `friendlyPlayerId` cuando el tipo lo exige | 400 |
| `friendlyPlayerId` en partido de liga | 400 |
| Borrar `FriendlyPlayer` con participaciones | 400 con mensaje claro |
| Reclamar perfil ya vinculado | 409 |
| Árbitro no asignado al partido | 403 (igual que hoy) |

---

## 10. Pruebas

Vitest (patrón actual en `tests/`):

- Schemas: create friendly match, paid patch, match event friendly vs league.
- Helper de stats amistosas (si vive en `src/lib`).
- Reglas de invariantes matchType (fixtures de objetos Zod).

Sin Playwright en este scope.

---

## 11. Migración

1. Agregar enums y tablas nuevas.
2. Hacer opcionales `seasonId` / `homeTeamId` / `awayTeamId` en `Match`.
3. Backfill: todos los `Match` existentes → `matchType = LEAGUE`.
4. Agregar `friendlyPlayerId` y `side` a `MatchEvent`.

Datos demo: opcional seed de 1 amistoso + 4–6 `FriendlyPlayer` en iteración posterior; no bloquea el feature.

---

## 12. Criterios de éxito

1. Admin crea jugadores amistosos y un partido con lados A/B y planteles.
2. Admin marca pagó/no pagó por jugador en cualquier momento.
3. Árbitro registra eventos; live público refleja marcador y nombres.
4. Stats de liga de `Player` no cambian por amistosos; hay agregados de amistosos.
5. Un perfil sin cuenta puede reclamarse una sola vez vía registro.
6. Partidos de liga siguen funcionando sin regresiones.
