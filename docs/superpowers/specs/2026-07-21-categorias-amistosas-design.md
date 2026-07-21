# Categorías amistosas — Design Spec

> Estado: **Plan listo**  
> Fecha: 2026-07-21  
> Motivación: el pool global de `FriendlyPlayer` mezcla jugadores de contextos distintos. Un amistoso debe pertenecer a un grupo fijo (como una temporada/campeonato), y solo esos jugadores pueden jugarlo.

---

## 1. Objetivo

Introducir **categorías amistosas** (grupos de jugadores) equivalentes conceptualmente a una temporada/liga para amistosos:

- Cada categoría tiene su propio roster de jugadores.
- Todo partido `FRIENDLY` **debe** pertenecer a una categoría.
- Solo jugadores de esa categoría pueden estar en el plantel del partido.
- Los jugadores de una categoría **no se mezclan** con los de otra.

## 2. Decisiones

| Tema | Decisión |
|------|----------|
| Nombre del modelo | `FriendlyCategory` (UI: **Categoría amistosa**) |
| Pertenencia del jugador | Un `FriendlyPlayer` pertenece a **exactamente una** categoría (`friendlyCategoryId` obligatorio) |
| Partido amistoso | `Match.friendlyCategoryId` obligatorio si `matchType = FRIENDLY`; null en liga |
| Pool global | **Eliminado.** El admin elige categoría y trabaja solo con ese roster |
| Stats | Siguen separadas de liga; al estar el jugador en una sola categoría, las stats ya no se mezclan entre grupos |
| Datos existentes en prod | Migración crea categoría `Amistosos (histórico)`, asigna jugadores y partidos FRIENDLY existentes |
| Fuera de alcance | Tabla de posiciones por categoría, fixtures automáticos, cobro online, coach/callups en amistosos |

## 3. Modelo de datos

```prisma
model FriendlyCategory {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  players     FriendlyPlayer[]
  matches     Match[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Cambios:

- `FriendlyPlayer.friendlyCategoryId` → requerido (FK)
- `Match.friendlyCategoryId` → opcional en DB; requerido en app/Zod si `FRIENDLY`

Invariantes:

- `LEAGUE` → `friendlyCategoryId` null
- `FRIENDLY` → `friendlyCategoryId` requerido; todos los `FriendlyMatchPlayer` del partido deben tener `friendlyPlayer.friendlyCategoryId === match.friendlyCategoryId`

## 4. Flujos admin

1. Crear **categoría** (nombre, descripción opcional, activa).
2. Crear/editar **jugadores** dentro de esa categoría.
3. Crear **partido amistoso** eligiendo primero la categoría → el form solo lista jugadores de esa categoría.

## 5. UX / nav

- Nueva sección admin: **Categorías amistosas** (`/admin/friendly-categories`).
- **Jugadores amistosos** pasa a filtrarse por categoría (query `?categoryId=` o selector).
- Form de partido amistoso: selector de categoría obligatorio antes del plantel.

## 6. APIs

- CRUD `/api/friendly-categories`
- `POST/PUT` friendly-players requiere `friendlyCategoryId`
- `POST` match FRIENDLY requiere `friendlyCategoryId` y valida membership
- Claim/registro: solo perfiles sin `userId` (opcionalmente filtrados por categoría activa)

## 7. No cambia

- Panel árbitro, live, reloj, eventos, asistencias (siguen leyendo el plantel del partido).
- Stats de liga / `Player.assists|goals`.
- Lados libres `sideAName` / `sideBName` y `paid`.
