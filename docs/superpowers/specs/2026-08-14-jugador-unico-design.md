# Jugador único — Design Spec

> Estado: **Diseño aprobado**
> Plan: [`docs/superpowers/plans/2026-08-14-jugador-unico.md`](../plans/2026-08-14-jugador-unico.md)
> Fecha: 2026-08-14
> Producto: **AdminTorneo**
> Depende de: organizaciones (`2026-08-14-admintorneo-organizations-design.md`)
> Siguiente: pool de árbitros; amistosos entre orgs reutilizan `Person`

---

## 1. Objetivo

Una persona es **una sola identidad** en la plataforma, aunque juegue liga en Kelme, amistosos en otra empresa, o ambos en la misma.

Hoy `Player` (liga, 1:1 con `User`) y `FriendlyPlayer` (pool amistoso por org) son mundos separados. Un mismo email no puede ser jugador de liga en dos empresas (`Player.userId` es unique global). Las stats de liga y amistosos no se cruzan.

Esta entrega introduce `Person` como identificador estable, enlaza ambas fichas, permite la misma persona en varias orgs, y muestra una carrera (liga / amistosos / total) sin reescribir el motor de eventos ni el live.

## 2. Decisiones recomendadas

| Tema | Elección | Por qué |
|------|----------|---------|
| Identidad canónica | Tabla `Person`, no fusionar `Player` y `FriendlyPlayer` | `MatchEvent` ya tiene `playerId` y `friendlyPlayerId`; fusionar tablas reescribe árbitro, live, formaciones y MVP |
| Cuenta de login | `Person.userId` opcional unique | Muchos amistosos no tienen email; el admin sigue creando fichas solo con nombre |
| Unicidad de liga | `Player`: unique `(personId, organizationId)` | Una ficha de liga por empresa; el equipo actual sigue en `Player.teamId`; el historial por temporada ya está en `SeasonRosterEntry` |
| Unicidad amistosa | `FriendlyPlayer`: unique `(personId, organizationId)` | El pool amistoso sigue siendo por empresa |
| `Player.userId` | Se elimina; el login va por `Person.userId` | Evita dos 1:1 contradictorios |
| `FriendlyPlayer.userId` | Se elimina; igual, vía `Person` | Una sola fuente |
| Stats de carrera | Agregadas desde `MatchEvent` (liga vs amistoso vs total) | Los contadores `Player.goals` siguen siendo cache de **liga de esa org**, no carrera global |
| Fusión | Admin de la org fusiona dos `Person` que tienen ficha en **su** org; platform admin puede fusionar entre orgs | Nombres repetidos son el caso real; no hay RUT en v1 |
| RUT / cédula | Fuera de v1 | Privacidad y fricción; el merge manual cubre duplicados |

### Alternativas descartadas

1. **Fusionar todo en `Player`.** Rompe amistosos (lados A/B, pago, galleta, pool sin cuenta).
2. **Solo relajar `Player.userId` unique, sin `Person`.** Los `FriendlyPlayer` sin cuenta seguirían sin identidad estable ni merge.

## 3. Alcance

### Incluido

- Modelo `Person` + FKs + backfill.
- Misma persona en N empresas (liga y/o amistosos).
- Alta de jugador de liga o amistoso: buscar `Person` existente (por email de cuenta, o por nombre en la org) o crear uno.
- Perfil de carrera en admin (ficha liga y ficha amistosa): partidos, goles, asistencias, amarillas, rojas, MVP — separados liga / amistosos / total.
- Merge de dos `Person` (admin org-local; platform cross-org).
- Reclamación de perfil amistoso: vincula `Person.userId` si está vacío; si el user ya tiene `Person`, se fusiona o se rechaza con 409.
- Tests de backfill, unicidad, carrera y merge.

### Excluido

- RUT, verificación de identidad, login social.
- Merge automático por similitud de nombre.
- Perfil público de carrera fuera del panel (el live no cambia).
- Transferencias de club, pases, contratos.
- Cambiar el dual FK de `MatchEvent` / MVP / formaciones.
- App móvil: el contrato `/api/mobile/v1/leagues/[slug]/*` no cambia; el perfil de jugador de una edición sigue siendo el roster de esa temporada.

## 4. Arquitectura

```text
Person          ← identidad estable (plataforma)
  ├─ user?      ← login opcional (email unique en User)
  ├─ players[]  ← una ficha de liga por organización
  └─ friendlyPlayers[] ← una ficha de pool amistoso por organización

MatchEvent / CallUp / SeasonRosterEntry / FriendlyMatchPlayer
  siguen apuntando a Player o FriendlyPlayer (no a Person).
  La carrera resuelve Person → fichas → eventos.
```

### 4.1 Unidades

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `Person` | Identidad (nombre, foto opcional, user opcional) | Alta, merge, carrera | User opcional |
| `src/lib/person.ts` | Crear/buscar/fusionar | APIs admin y reclamación | Prisma |
| `src/lib/person-career.ts` | Agrega eventos liga vs amistoso | Perfil admin | MatchEvent, Match.matchType |
| Player / FriendlyPlayer | Participación en una org | Igual que hoy en partidos | Person, Organization |

## 5. Modelo de datos

```prisma
model Person {
  id            String   @id @default(cuid())
  userId        String?  @unique
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  firstName     String
  lastName      String
  photoMimeType String?
  photoData     Bytes?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  players          Player[]
  friendlyPlayers  FriendlyPlayer[]
}
```

Cambios:

- `Player.personId` obligatorio; se quita `Player.userId`. Unique `@@unique([personId, organizationId])`. Se agrega `Player.organizationId` (redundante con `Team.organizationId` pero necesario cuando `teamId` es null).
- `FriendlyPlayer.personId` obligatorio; se quita `FriendlyPlayer.userId`. Unique `@@unique([personId, organizationId])`.
- `User.player` y `User.friendlyPlayer` 1:1 desaparecen; `User.person` 1:1 opcional.

`firstName`/`lastName` en `FriendlyPlayer` se conservan como **copia denormalizada** para no romper listados y live en v1; la fuente de verdad al editar es `Person`. Al guardar ficha se sincronizan nombre y foto hacia `Person` (y viceversa si se edita Person).

### 5.1 Backfill

Idempotente, en la misma migración SQL:

1. Por cada `Player`: crear `Person` con `userId = Player.userId`, `firstName`/`lastName` partiendo `User.name` (primer token = firstName; resto = lastName; si un solo token, lastName = `""` y firstName = el token).
2. Por cada `FriendlyPlayer` con `userId` que ya tiene `Person`: set `personId`.
3. Por cada `FriendlyPlayer` con `userId` sin `Person` (no era jugador de liga): crear `Person` y enlazar.
4. Por cada `FriendlyPlayer` sin `userId`: crear `Person` con su `firstName`/`lastName` (sin user).
5. Set `Player.organizationId` desde `Team.organizationId`; si `teamId` es null, usar la membership `PLAYER` del user; si no hay, usar la org de Kelme (`slug = kelme`) — en prod actual todos los players de liga tienen equipo Kelme.
6. Unique indexes **después** del backfill y **antes** de `SET NOT NULL` de `personId`.
7. Drop `Player.userId`, `FriendlyPlayer.userId`.

No fusionar automáticamente dos `FriendlyPlayer` homónimos sin cuenta: quedan dos `Person`. El admin los junta con merge.

## 6. Permisos y flujos

### Alta / edición (ORG_ADMIN, solo su org)

- Crear jugador de liga: elige o crea `Person`; crea `Player` en esa org; opcionalmente crea `User` y setea `Person.userId` si estaba vacío.
- Crear amistoso: igual, `FriendlyPlayer` en esa org.
- Si el `Person` ya tiene ficha de ese tipo en la org → 409.
- No puede editar fichas de otras orgs ni ver el directorio global de personas. Búsqueda: (a) email exacto de un `User` existente; (b) personas que ya tienen ficha en **esta** org.

### Merge

- **ORG_ADMIN:** elige origen y destino. Ambas deben tener al menos una ficha en su org. Se reasignan `Player`/`FriendlyPlayer` de **esa org** al destino; si el destino ya tiene ficha del mismo tipo en esa org → 409 (hay que borrar o editar antes). `Person` origen se borra solo si queda sin fichas en ninguna org y sin `userId`.
- **Platform admin:** merge global: reasigna todas las fichas; si hay conflicto `(personId, organizationId)` → 409 listando las orgs. El `userId` del origen se mueve al destino si el destino no tiene cuenta; si ambos tienen cuenta → 409 (no se fusionan logins).

Las filas `Player` / `FriendlyPlayer` conservan su `id` (eventos y MVP no se reescriben). El merge solo actualiza `personId` de las fichas de esa org hacia el destino. Si el destino ya tiene ficha del mismo tipo en esa org → 409. Si el origen tiene `Player` y el destino solo `FriendlyPlayer` en la misma org, el destino queda con ambas.

### Reclamación

Flujo actual `/api/friendly-players/claim`: si el `FriendlyPlayer.person.userId` es null, se asigna el user. Si el user ya tiene `Person` distinto, 409 pidiendo que un admin fusione.

### Carrera (admin)

`GET /api/admin/persons/[id]/career` scoped: el person debe tener ficha en `activeOrganizationId`. Respuesta:

```ts
{
  person: { id, firstName, lastName, hasAccount: boolean }
  league: { matches, goals, assists, yellowCards, redCards, mvps }
  friendly: { matches, goals, assists, yellowCards, redCards, mvps }
  total: { matches, goals, assists, yellowCards, redCards, mvps }
}
```

`total.*` es la suma aritmética de `league.*` + `friendly.*` (los `matches` también se suman; un mismo `matchId` no existe a la vez en liga y amistoso).

Jugador logueado: su `/player` puede mostrar el mismo resumen **solo de la org activa** (no carrera cross-org en v1, para no filtrar datos de otra empresa al compañero de camarín). Platform y el propio user con N memberships ven la org activa; un futuro “mi carrera global” queda fuera.

## 7. UX

- Ficha admin de jugador de liga y de amistoso: bloque “Persona” (nombre, foto, si tiene cuenta).
- Botón “Fusionar con otra ficha” en listados, con buscador por nombre **dentro de la org**.
- No hay directorio `/plataforma/personas` en v1 (solo merge puntual).

Copy es-CL, tú. Ejemplos: “Esta persona ya es jugador de liga en esta organización”, “No se pueden unir dos cuentas distintas; pide a plataforma que revise”.

## 8. Errores

- Email ya ligado a otro `Person` → 409.
- Unique `(personId, organizationId)` → 409.
- Merge con dos cuentas → 409.
- Merge de personas sin ficha en la org del admin → 403.
- Backfill: `User.name` vacío → `firstName = "Sin nombre"`, `lastName = ""`.

## 9. Pruebas

- Backfill: Player+FriendlyPlayer del mismo user → un `Person`.
- Dos FriendlyPlayer homónimos sin user → dos `Person`.
- Mismo Person con Player en org A y FriendlyPlayer en org B.
- Intentar segundo `Player` en la misma org → error unique.
- Carrera: gol de liga no suma en `friendly.goals`.
- Merge org-local no toca fichas de otra org.
- Claim: user nuevo se liga; user con Person distinto → 409.
- Live y APIs móviles de edición publicada siguen 200 sin campos nuevos obligatorios.

## 10. Fuera de discusión en implementación

No se cambia reloj, formaciones, MVP, realtime ni el contrato móvil público. `MatchEvent` conserva dual FK.
