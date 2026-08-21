# Temporada por categoría — Design Spec

> Plan: pendiente (`docs/superpowers/plans/2026-08-21-temporada-por-categoria.md` tras aprobación)
> Fecha: 2026-08-21
> Producto: **LigaLab**
> Depende de: roster unificado; wizard de temporada; `FriendlyCategory` / `PlayerCategory`
> Estado: **Diseño en revisión**

---

## 1. Objetivo

Un club (Búfalos) es **un** `Team`. La categoría (+35, +40, Senior) no vive en el nombre del equipo: vive en la **temporada** y en la **inscripción**.

Una temporada (Apertura 2026) agrupa varias categorías. Cada categoría tiene su propia inscripción, partidos y tabla. Un jugador de 40 años puede estar en Búfalos +35 **y** Búfalos +40 de la misma temporada; no puede estar en dos clubes de la misma categoría.

Hoy eso no se puede: `SeasonTeam` es único por `(seasonId, teamId)` y el partido de liga no sabe en qué categoría se juega. Liga Kelme Sur lo evadió creando un equipo distinto por categoría.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Identidad del club | Un `Team` = un club | Búfalos no se duplica en el directorio |
| Forma de la temporada | Una temporada, N categorías | Apertura 2026 contiene +35 y +40 |
| Catálogo | El mismo `FriendlyCategory` de la org | +35 vale para amistoso y para liga; sin segundo catálogo |
| Cómo entran las categorías | El admin elige cuáles al crear | Senior puede existir en la org y no entrar a esta temporada |
| Inscripción en el wizard | Por categoría, en bloques | Primero +35 (clubes + plantel), después +40 |
| Elegibilidad de plantel | Jugadores con `PlayerCategory` de esa categoría | Reusa etiquetas actuales |
| Exclusividad | Un club por jugador **por categoría de temporada** | Mismo club en dos categorías: sí. Dos clubes en +35: no |
| Partido de liga | Lleva `seasonCategoryId` | Tabla +35 no se mezcla con +40 |
| App móvil (UX) | Fuera de rediseño | Sí hay que **no romper** tablas: agrupar por categoría |

### Alternativas descartadas

1. **Un equipo por categoría** (“Búfalos +35” / “Búfalos +40”). Rompe club único.
2. **Temporada hija por categoría.** Choca con “1 edición móvil = 1 temporada” y duplica fechas/formato.
3. **Catálogo de liga separado.** El usuario eligió un solo catálogo.
4. **Inscripción por club con checkboxes de categoría.** Válido en UX, pero el usuario eligió bloques por categoría.

---

## 3. Alcance

### Incluido

- Prisma: `SeasonCategory`; `SeasonTeam` por `(temporada, club, categoría)`; `Match.seasonCategoryId` en liga.
- Migración de `SeasonTeam` existente (sin categoría) a una categoría de respaldo por temporada, o temporada marcada “sin categorías” hasta que el admin las asigne.
- Wizard crear temporada: paso categorías + inscripción por categoría.
- APIs: crear/editar temporada con `categoryIds`; inscripción anidada por categoría; partido de liga exige categoría.
- Wizard partido de liga: temporada → categoría → clubes inscritos en esa categoría.
- Validación de plantel y de “un club por categoría”.
- Tablas admin dashboard y API móvil de standings: **una tabla por categoría** (cambio mínimo de contrato, no rediseño visual de la app).
- Tests de inscripción, conflicto de club, partido cruzado de categoría, standings separados.

### Excluido

- Fusionar los 8 equipos de Kelme Sur en 4 clubes.
- Renombrar `FriendlyCategory` a `Category`.
- Publicar edición móvil desde el wizard (sigue igual).
- Fixture automático / calendario.
- Edad calculada desde RUT o fecha de nacimiento (la etiqueta la pone el admin).
- Rediseño de home/navegación de la app Expo.

---

## 4. Arquitectura

```text
Organization
  └─ FriendlyCategory[]          ← catálogo único (+35, +40, Senior)
        ├─ PlayerCategory[]      ← etiqueta del jugador (eligibilidad)
        └─ SeasonCategory[]      ← qué categorías entran a una temporada

Season
  └─ SeasonCategory[]            ← Apertura 2026 → +35, +40 (orden)
        └─ SeasonTeam[]          ← Búfalos en +35 de Apertura 2026
              └─ SeasonRosterEntry[]  ← plantel de esa inscripción

Match LEAGUE
  ├─ seasonId
  ├─ seasonCategoryId            ← obliga local/visita de esa inscripción
  ├─ homeTeamId / awayTeamId     ← Club (Team)
  └─ (standings filtran por seasonCategoryId)
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `FriendlyCategory` | Catálogo de la org | Admin categorías, wizard, amistosos | Organization |
| `SeasonCategory` | Participación de una categoría en una temporada | Wizard, partidos, tablas | Season, FriendlyCategory |
| `SeasonTeam` | Inscripción club+categoría | Plantel, partidos, móvil | SeasonCategory, Team |
| `SeasonRosterEntry` | Jugador en esa inscripción | Convocatoria liga, app | SeasonTeam, Player |
| Wizard temporada | Alta en 5 pasos | Admin | APIs seasons + enrollment |
| Wizard partido liga | Elige categoría de la temporada | Admin | SeasonCategory, SeasonTeam |
| Standings | Una tabla por `SeasonCategory` | Dashboard admin + `/standings` móvil | Matches LEAGUE |

---

## 5. Modelo de datos

### 5.1 Prisma (concepto)

```prisma
model SeasonCategory {
  id         String   @id @default(cuid())
  seasonId   String
  season     Season   @relation(...)
  categoryId String
  category   FriendlyCategory @relation(...)
  sortOrder  Int      @default(0)
  seasonTeams SeasonTeam[]
  matches     Match[]
  createdAt  DateTime @default(now())

  @@unique([seasonId, categoryId])
  @@index([seasonId, sortOrder])
}

model SeasonTeam {
  // seasonId se mantiene denormalizado para queries existentes
  seasonId         String
  seasonCategoryId String
  seasonCategory   SeasonCategory @relation(...)
  teamId           String
  // ... displayName, color, crest, status, sortOrder ...

  @@unique([seasonCategoryId, teamId])
  // se elimina @@unique([seasonId, teamId])
}

model Match {
  seasonCategoryId String?
  seasonCategory   SeasonCategory? @relation(...)
  // LEAGUE nuevo: seasonCategoryId obligatorio
  // FRIENDLY: null; sigue usando friendlyCategoryId como etiqueta del amistoso
}
```

`FriendlyCategory` gana relación `seasonCategories`. No se toca `PlayerCategory`.

### 5.2 Reglas de integridad

1. `SeasonCategory.categoryId` debe ser `FriendlyCategory` de la misma `organizationId` que la temporada.
2. Crear temporada exige **al menos una** categoría.
3. Inscribir un club en una categoría exige `SeasonCategory` de esa temporada.
4. Cada `playerId` del plantel debe tener `PlayerCategory` para esa categoría.
5. Un `playerId` no puede estar `ACTIVE` en dos `SeasonTeam` del mismo `seasonCategoryId` (clubes distintos, misma categoría).
6. Un `playerId` **sí** puede estar `ACTIVE` en Búfalos +35 y Búfalos +40 (`seasonCategoryId` distintos).
7. Partido `LEAGUE`: `seasonId` y `seasonCategoryId` requeridos; local ≠ visita; ambos `SeasonTeam` con `status = REGISTERED` en ese `seasonCategoryId`.
8. No se borra una `SeasonCategory` si tiene partidos. Primero se retiran o se mueven.

### 5.3 Migración de datos existentes

Temporadas actuales no tienen `SeasonCategory`. `SeasonTeam` hoy es único por `(seasonId, teamId)`.

Pasos:

1. Agregar tablas/columnas (FKs nullable al inicio si hace falta).
2. Por cada temporada **con** `SeasonTeam` o partidos `LEAGUE` y **cero** categorías de catálogo en la org: crear `FriendlyCategory` “General” (nombre fijo, `isActive = true`) solo si la org no tiene ninguna categoría, y usarla.
3. Por cada temporada con inscripción o partidos de liga: si la org tiene **exactamente una** categoría activa, usarla. Si tiene **varias**, no adivinar. Esa temporada queda **legacy**: cero filas `SeasonCategory` y `SeasonTeam.seasonCategoryId` null hasta que un admin elija categorías en edición. Mientras tanto no se crean partidos de liga nuevos. No hay columna extra de estado.
4. Si la org tiene una sola categoría (Liga Le Park = +35): backfill automático de `SeasonCategory` + `seasonCategoryId` en `SeasonTeam` y partidos `LEAGUE` de esa temporada.
5. Drop `@@unique([seasonId, teamId])`. Unique nuevo: `[seasonCategoryId, teamId]` (PostgreSQL permite múltiples nulls en unique → los legacy null no chocan).
6. Partidos `FRIENDLY`: `seasonCategoryId` siempre null.

Kelme Sur (8 clubes, 4 categorías, jugadores ya etiquetados): no se fusionan clubes. Al crear una temporada nueva con el wizard, cada club se inscribe en **una** categoría (la de sus jugadores). Búfalos-como-un-club queda para ligas que ya tengan el directorio así.

---

## 6. Wizard de temporada

Ruta: `/{org}/admin/seasons/new` (ya existe).

| Paso | Contenido |
|------|-----------|
| 1 | Nombre, formato, fechas |
| 2 | Multi-select del catálogo de la org (mínimo 1). Vacío → CTA a `/admin/friendly-categories` |
| 3 | Un bloque por categoría elegida, en `sortOrder`. Clubes de la org; al marcar un club, plantel filtrado por `PlayerCategory`. Opcional. |
| 4 | App móvil (igual que hoy, sin publicar) |
| 5 | Resumen: categorías + clubes/jugadores por categoría |

Al guardar, en una transacción:

1. `POST` temporada (nombre/fechas/formato).
2. Insertar `SeasonCategory` en orden.
3. Si hay inscripción, `PUT` enrollment por categoría.
4. Si hay config móvil, `PUT` mobile (`isPublished: false`).

Si 3 o 4 fallan: la temporada ya existe; redirigir a ficha / app móvil con el error. No dejar `SeasonCategory` a medias: 1+2 van juntos; 3 y 4 son posteriores.

Edición posterior (mínimo de esta entrega): la página App móvil / inscripción actual pasa a ser **por categoría** (selector o acordeón). Quitar una categoría de una temporada con partidos → error claro.

---

## 7. Partidos de liga

Wizard `/{org}/admin/matches/new`:

1. Temporada.
2. Categoría (solo `SeasonCategory` de esa temporada). Si la temporada es legacy sin categorías, bloquear con mensaje: “Asigna categorías a la temporada”.
3. Local / visita: `SeasonTeam REGISTERED` de esa categoría.
4. Resto igual (árbitro, fecha, ubicación, eventos).

Lista admin, live y panel árbitro: mostrar el nombre de la categoría junto al de la temporada. Convocatoria de liga: jugadores del `SeasonRosterEntry` de **esa** inscripción, no del club entero.

Amistosos: sin cambio. Siguen usando `friendlyCategoryId` como etiqueta opcional del partido; la convocatoria sigue siendo el plantel de la org.

---

## 8. APIs

### `POST /api/seasons`

Ampliar body:

```ts
{
  name, startDate, endDate, footballFormat,
  categoryIds: string[] // min 1, de la org, activas
}
```

Crea `Season` + `SeasonCategory` (`sortOrder` = índice). Enrollment y mobile siguen en sus rutas.

`PATCH`/`PUT` temporada: opcional `categoryIds` con las reglas de no borrar categorías con partidos.

### `PUT /api/admin/seasons/:id/enrollment`

Hoy: `{ teams: [{ teamId, displayName, color, sortOrder, playerIds }] }`.

Pasa a:

```ts
{
  categoryId: string,
  teams: [{ teamId, displayName, color, sortOrder, playerIds }]
}
```

Un PUT = una categoría. El wizard llama una vez por categoría con clubes. Quitar un club de esa categoría = no enviarlo (status `WITHDRAWN`, igual que hoy).

`GET` enrollment: `{ categories: [{ categoryId, name, teams: [...] }] }`.

### `POST /api/matches` (`LEAGUE`)

Requiere `seasonId` + `seasonCategoryId` (o `categoryId` resuelto a `SeasonCategory`). Rechaza 400 si local/visita no están inscritos en esa categoría.

### Móvil `/api/mobile/v1/leagues/[slug]/standings`

Hoy: lista plana. Pasa a:

```ts
{ categories: [{ categoryId, name, rows: MobileStandingRow[] }] }
```

Contrato `@liga/mobile-contracts`: ampliar de forma aditiva. Cliente Expo: si llega `categories`, renderiza N tablas; si un cliente viejo espera array, versionar o mantener `rows` como concatenación **solo si hay una categoría** (si hay varias, `rows` vacío + `categories` lleno para no mezclar Búfalos dos veces).

Dashboard admin: `standings` agrupado igual (N tablas apiladas con título de categoría).

---

## 9. Permisos y errores

- Solo `ORG_ADMIN` crea temporada, categorías de temporada e inscripción.
- COACH/PLAYER/REFEREE no cambian.
- Mensajes (es-CL):
  - “Elige al menos una categoría.”
  - “Ese jugador no está en la categoría +35.”
  - “Un jugador no puede estar en dos clubes de la misma categoría.”
  - “Local y visita deben estar inscritos en esta categoría.”
  - “No puedes quitar +35: hay partidos en esa categoría.”

---

## 10. Tests

- Crear temporada con +35 y +40; Búfalos inscrito en ambas con planteles distintos; el mismo `playerId` en ambos planteles → 201.
- El mismo `playerId` en Búfalos +35 y Cobre Sur +35 → 400.
- Jugador sin etiqueta +35 en plantel +35 → 400.
- Partido liga +35 con visita solo inscrita en +40 → 400.
- Partido liga +35 entre dos inscritos +35 → 201; `seasonCategoryId` persistido.
- Standings: un triunfo +35 de Búfalos no suma en la tabla +40.
- Temporada org con 0 categorías en catálogo → wizard no avanza el paso 2.
- Backfill: org de una sola categoría; `SeasonTeam` legacy recibe `seasonCategoryId`.
- Regresión amistoso: crear amistoso con `friendlyCategoryId` no escribe `seasonCategoryId`.

---

## 11. Rollout

1. Migración Prisma (additive) + backfill del caso “una categoría”.
2. APIs y validaciones.
3. Wizard temporada + wizard partido liga + listados.
4. Standings admin + contrato móvil.
5. Deploy Vercel (el push a `main` no siempre dispara build: verificar deployment).
6. No hay merge de clubes en prod.

Rollback: columnas nuevas nullable; si hay que revertir UI, los partidos nuevos con `seasonCategoryId` siguen siendo válidos.
