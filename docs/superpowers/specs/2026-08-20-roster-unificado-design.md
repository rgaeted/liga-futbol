# Roster unificado por empresa — Design Spec

> Estado: **Diseño aprobado** (pendiente review del archivo)
> Plan: _(se escribe tras aprobación de este spec)_
> Fecha: 2026-08-20
> Producto: **LigaLab**
> Depende de: organizaciones; jugador único (`Person`); amistosos entre orgs
> Relacionado: sustituye el dual `Player` / `FriendlyPlayer` de la spec de jugador único para participación en partidos

---

## 1. Objetivo

Los jugadores pertenecen a **una o muchas empresas** vía ficha `Player` por org. Quien está en el roster de la empresa puede jugar **amistosos**, aunque también pertenezca a un equipo de liga.

Hoy el pool amistoso es `FriendlyPlayer` (mundo separado). Al crear un amistoso solo se convoca desde ese pool. El admin mantiene dos pantallas y el motor de eventos/MVP/formaciones bifurca `playerId` vs `friendlyPlayerId`.

Esta entrega **unifica el roster en `Player`**, migra datos, deja un solo directorio admin, y en el wizard de amistoso permite filtrar por equipo (y categoría) para cargar planteles rápido a lados A/B libres.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Ficha única por org | Solo `Player` (`@@unique([personId, organizationId])`) | Un roster; `teamId` opcional |
| Elegibilidad amistoso | Todos los `Player` de la empresa | Sin flag extra; filtro por equipo/categoría en UI |
| Estructura del amistoso | Lados libres A/B (nombres libres) | Como hoy; el filtro por equipo solo ayuda a cargar convocados |
| Categorías | Etiquetas N:N del `Player` (ex `FriendlyPlayerCategory`) | Filtro extra al armar amistoso; se conserva `FriendlyCategory` (o rename cosmético) |
| Admin | Una pantalla **Jugadores** | Desaparece “Jugadores amistosos” |
| Corte técnico | Migración limpia (enfoque A) | Evita dual-write y deuda; un camino en árbitro/live |
| Eventos / MVP / formaciones | Solo `playerId` / `assistPlayerId` | Eliminar `friendlyPlayerId` y `assistFriendlyPlayerId` |
| Participación amistosa | `FriendlyMatchPlayer.playerId` | Conserva `side`, `paid`, `isGalleta`, starter/captain/coach, `slotKey` |
| Desafíos entre orgs | Visitante arma lado B con sus `Player` | Mismo roster unificado; volcar equipo = filtrar `teamId` |

### Alternativas descartadas

1. **Puente / dual-write** (`Player` + `FriendlyPlayer` conviviendo). Más seguro a corto plazo, pero desync y semanas de deuda.
2. **Solo UI mezclando ambos pools.** No cumple “un solo modelo”.
3. **Amistoso solo Equipo vs Equipo.** Rompe Blancos vs Negros / lados libres que se usan hoy.
4. **Flag `puedeJugarAmistosos`.** Complejidad innecesaria si todos del roster pueden jugar.

---

## 3. Alcance

### Incluido

- Migración: `FriendlyPlayer` → `Player`; reapuntar participaciones, eventos, MVP, formaciones, categorías.
- Drop de `FriendlyPlayer` y columnas dual-FK amistosas en `MatchEvent` / `MatchTeamMvp` / formaciones.
- Admin unificado: CRUD jugadores (equipo opcional + categorías + persona).
- Wizard / convocatoria amistoso: pool = roster org; filtros equipo, categoría, nombre; acción “agregar todo el equipo X → lado A|B”.
- APIs: ampliar `/api/players*`; retirar `/api/friendly-players*` tras cutover.
- Árbitro, live, timeline, challenges: un solo camino `playerId`.
- Carrera `Person`: amistosos y liga se agregan desde `MatchEvent` vía `playerId` + `Match.matchType` (sin rama `friendlyPlayerId`).
- Tests de backfill, convocatoria con filtro equipo, gol/MVP amistoso, desafío visitante, regresión liga.

### Excluido

- App móvil de edición (sigue solo liga).
- RUT, merge automático por nombre.
- Convertir amistosos en partidos de tabla / temporada.
- Rediseño visual del live (solo datos).
- Renombrar obligatoriamente `FriendlyCategory` / `FriendlyMatchPlayer` (pueden quedar nombres históricos; lo importante es el FK a `Player`).

---

## 4. Arquitectura

```text
Person
  └─ Player[]                    ← 1 ficha por empresa
        ├─ teamId?               ← liga (opcional)
        ├─ categories[]          ← etiquetas (ex FriendlyPlayerCategory)
        ├─ friendlyParticipations FriendlyMatchPlayer[]
        └─ matchEvents / MVP / formaciones

Match FRIENDLY
  └─ FriendlyMatchPlayer (side A|B, paid, galleta, …) → Player
       Player.organizationId ∈ { host org, guest org }
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `Player` | Roster de la empresa | Admin, convocatoria, liga | Person, Organization, Team? |
| `PlayerCategory` (o join renombrado) | Etiquetas | Filtros amistoso | Player, FriendlyCategory |
| `FriendlyMatchPlayer` | Plantel del partido | Wizard, pago, galleta, DT | Match, Player |
| `src/lib/players.ts` (ampliado) | CRUD + listados filtrados | APIs admin | Prisma |
| Migración SQL + script verify | Backfill y drop | Deploy | Prisma |

---

## 5. Modelo de datos

### 5.1 Cambios Prisma (concepto)

```prisma
model Player {
  // ... campos actuales de liga ...
  // Campos absorbidos desde FriendlyPlayer (si no existen ya vía Person):
  dominantFoot      DominantFoot?
  primaryPosition   String?
  secondaryPosition String?
  // foto: preferir Person; si FriendlyPlayer tenía foto y Person no, copiar en backfill

  categories        PlayerCategory[]
  friendlyParticipations FriendlyMatchPlayer[]
}

model PlayerCategory {
  playerId           String
  player             Player           @relation(...)
  friendlyCategoryId String
  friendlyCategory   FriendlyCategory @relation(...)
  @@id([playerId, friendlyCategoryId])
}

model FriendlyMatchPlayer {
  playerId String
  player   Player @relation(...)
  // side, paid, isGalleta, isStarter, isCaptain, isCoach, slotKey — sin cambio
  @@unique([matchId, playerId])
}

model MatchEvent {
  playerId String?
  assistPlayerId String?
  side FriendlySide? // se mantiene para scoring A/B en amistosos
  // SIN friendlyPlayerId / assistFriendlyPlayerId
}
```

`MatchTeamMvp`: solo `playerId` (nullable). Formaciones siguen por `side`/`teamId` en `MatchFormation`; slots en `FriendlyMatchPlayer.slotKey`.

**Nombre denormalizado:** se dejan de usar `FriendlyPlayer.firstName`/`lastName`; listados y live leen `Person` (como ya hace la carrera).

### 5.2 Backfill (idempotente)

Orden sugerido en una migración (o migración + script verificado):

1. **Mapa** `FriendlyPlayer.id` → `Player.id`:
   - Si existe `Player` con mismo `(personId, organizationId)` → usar ese id.
   - Si no → `INSERT Player` con ese `personId`/`organizationId`, `teamId = null`, copiar posiciones/pie/foto hacia Person o Player según reglas actuales de denormalización.
2. **Categorías:** insertar `PlayerCategory` desde `FriendlyPlayerCategory` usando el mapa (ignorar duplicados).
3. **Participaciones:** `FriendlyMatchPlayer.friendlyPlayerId` → `playerId` (columna nueva, backfill, luego drop vieja + unique).
4. **MatchEvent / assists / MVP / formaciones:** igual, remap a `playerId` / `assistPlayerId`.
5. **Conflictos:** si un mismo match ya tiene el mismo `playerId` por duplicar dos FriendlyPlayer que colapsaron al mismo Person+org → resolver en script (merge filas de participación: preferir paid/galleta/captain no nulos; loguear ids). Caso raro; test explícito.
6. Drop `FriendlyPlayer`, FKs y columnas legacy.
7. Verify: conteos participaciones/eventos pre/post; 0 huérfanos.

### 5.3 Person / merge

- Merge de `Person` (admin/plataforma) ya reasigna `Player`; deja de reasignar `FriendlyPlayer`.
- Si tras unificar quedan dos `Player` en la misma org para la misma persona, es bug de backfill (unique lo impide).

---

## 6. Permisos y flujos

### Admin org

- Alta jugador: Person existente o nuevo; `Player` en la org; `teamId` opcional; categorías opcionales.
- Edición: equipo, categorías, datos Person (nombre/foto).
- No ve ni edita `Player` de otras orgs.

### Convocatoria amistoso (host)

- Lista candidatos: `Player` where `organizationId = host`.
- Filtros: `teamId`, `categoryId`, `q` (nombre).
- “Agregar equipo completo → lado A|B”: inserta participaciones faltantes; no duplica.
- Reglas actuales de capitán/DT por lado se mantienen.

### Desafío (guest)

- Tras ACCEPTED, visitante convoca `Player` de **su** `organizationId` al lado B (mismas reglas de filtro por equipo).
- Host no edita plantel B.

### Árbitro / eventos

- Amistoso: body con `playerId`; el `side` del evento se deriva de la participación (`FriendlyMatchPlayer.side`) o se envía y se valida contra ella (mismo invariante que hoy).
- Validar que el jugador tenga `FriendlyMatchPlayer` en ese match (o esté en call-up si liga).
- Contadores `Player.goals` etc. siguen siendo cache de **liga**; goles amistosos no los incrementan (carrera los agrega por `matchType`).

### Reclamación / registro

- Flujos que hoy crean o reclaman `FriendlyPlayer` pasan a crear/vincular `Player` en la org.

### `FRIENDLY_COACH`

- Sin cambio de rol: acceso a amistosos vía membership; en partido sigue `isCoach` en participación.

---

## 7. UX

- Nav admin: un ítem **Jugadores**; quitar **Jugadores amistosos**.
- Listado: columnas equipo, categorías; filtros equipo / categoría / sin equipo.
- Wizard amistoso y editores de convocatoria (`FriendlyMatchConvocationPicker`, etc.): selector unificado + botón agregar equipo.
- Copy es-CL: “Agregar todo el equipo…”, “Sin equipo”, “Categorías”.

---

## 8. APIs

| Ruta | Cambio |
|------|--------|
| `GET/POST /api/players` | Listado con `teamId`, `categoryId`, `q`; alta unificada |
| `PATCH/DELETE /api/players/[id]` | Incluye categorías y campos de perfil absorbidos |
| `POST .../photo` | Unificar foto (Person/Player según patrón actual) |
| `/api/friendly-players*` | Retirar tras cutover (410 o eliminación de rutas) |
| `POST /api/matches`, convocatoria, events, mvp, formations | Solo `playerId` |
| Challenges accept / guest roster | Players de org visitante |

Validación Zod: un solo schema de id de jugador en eventos amistosos.

---

## 9. Errores

- Jugador de otra org en convocatoria host → 400/403.
- Duplicado `(matchId, playerId)` → 409.
- Agregar equipo vacío → 400 con mensaje claro.
- Evento amistoso con `playerId` no convocado → 400.
- Backfill con conflicto de colapso → script falla ruidoso (no silenciar).

---

## 10. Pruebas

- Backfill fixture: FriendlyPlayer solo + FriendlyPlayer con Person que ya tiene Player → un Player; categorías y N eventos remapeados.
- Convocatoria: filtrar por equipo; “agregar todos” a lado A; conteo correcto.
- Árbitro registra gol en amistoso con `playerId`.
- MVP / timeline admin amistoso sin campos friendly*.
- Desafío: guest lista solo sus players; host no puede mutar lado B.
- Liga: callups, stats cache `Player.goals`, sin regresión.
- Career API: friendly stats desde eventos con `matchType=FRIENDLY` y `playerId`.

---

## 11. Orden de implementación (alto nivel)

1. Schema + migración/backfill + verify script (feature flag opcional: no requerido si deploy atómico).
2. Dominio listados/CRUD players + categorías.
3. Convocatoria / wizard / challenges UI+API.
4. Eventos, MVP, formaciones, referee, live snapshot.
5. Admin unificado; borrar pantallas y APIs friendly-players.
6. Actualizar career/merge/claim; tests E2E críticos; deploy prod.

---

## 12. Relación con specs previas

- **Jugador único (2026-08-14):** `Person` se mantiene. La decisión “no fusionar Player y FriendlyPlayer” queda **superseded** por esta spec para el modelo de participación.
- **Amistosos entre orgs (2026-08-14):** flujo de desafío igual; pool visitante = `Player` de la org guest (actualiza la frase que habla de `FriendlyPlayer`).
