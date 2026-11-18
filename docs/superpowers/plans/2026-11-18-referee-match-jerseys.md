# Dorsal por partido asignado por el árbitro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El árbitro asignado fija el dorsal de cada jugador para un partido (liga o amistoso) mientras está `SCHEDULED`; queda fijo al iniciar.

**Architecture:** Tabla nueva `MatchPlayerJersey` (matchId, playerId, teamKey, number). `teamKey` es el id del equipo en liga y `'A'`/`'B'` en amistosos. Ruta `PUT /api/matches/[id]/jerseys`, editor móvil en el panel del árbitro, y lectura del dorsal del partido (con respaldo a `Player.jerseyNumber`) en panel, timeline y lineup.

**Tech Stack:** Next.js (revisar `node_modules/next/dist/docs/` antes de tocar rutas/páginas), Prisma, Zod, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-referee-match-jerseys-design.md`

## Global Constraints

- Textos de UI en es-CL con tuteo (sin voseo).
- Dorsal entero 0–99; `null` borra el dorsal del partido.
- No se modifica `Player.jerseyNumber`, `CallUp` ni `FriendlyMatchPlayer`.
- Solo el árbitro asignado (`match.refereeId === session.user.id`) o `ORG_ADMIN` edita; solo con `status === SCHEDULED`.
- Un número no puede repetirse dentro del mismo equipo en el mismo partido.

## Review Focus

- Dos jugadores del mismo equipo con el mismo número → 409 con mensaje claro; el mismo número en equipos distintos es válido.
- Partido ya iniciado (`LIVE`, `HALFTIME`, `FINISHED`) → 400, sin escribir.
- `playerId` que no pertenece a ninguno de los dos equipos del partido → 400.
- Árbitro que no es el asignado → 403.
- Jugador sin dorsal de partido ni permanente → se muestra `#—`, sin romper el orden.

---

### Task 1: Modelo y helpers puros

**Files:**
- Modify: `prisma/schema.prisma` (modelo nuevo + relaciones inversas en `Match` y `Player`)
- Create: `prisma/migrations/20261118000000_match_player_jersey/migration.sql`
- Create: `src/lib/match-jerseys.ts`
- Create: `src/lib/validations/match-jersey.ts`
- Test: `tests/lib/match-jerseys.test.ts`

**Interfaces:**
- Produces:
  - `model MatchPlayerJersey { id, matchId, playerId, teamKey String, number Int, createdAt, updatedAt }` con `@@unique([matchId, playerId])`, `@@unique([matchId, teamKey, number])`, `onDelete: Cascade` hacia `Match` y `Player`.
  - `setMatchJerseySchema` (Zod): `{ playerId: string (min 1), number: int 0–99 | null }`.
  - `effectiveJersey(matchNumber: number | null | undefined, permanent: number | null | undefined): number | null` — el del partido si existe, si no el permanente, si no `null`.
  - `jerseyLabel(label: string, number: number | null): string` — `"#7 Nombre"`, o `"#— Nombre"` si es `null`.

- [ ] **Step 1: Escribir tests** en `tests/lib/match-jerseys.test.ts`: `effectiveJersey(5, 9) === 5`, `effectiveJersey(undefined, 9) === 9`, `effectiveJersey(null, null) === null`, `effectiveJersey(0, 9) === 0` (0 es válido); `jerseyLabel('Ana Pérez', 7) === '#7 Ana Pérez'`, `jerseyLabel('Ana Pérez', null) === '#— Ana Pérez'`; el schema acepta `{playerId:'p', number:0}`, `{playerId:'p', number:99}`, `{playerId:'p', number:null}` y rechaza `100`, `-1`, `1.5`, `playerId: ''`.
- [ ] **Step 2:** `npx vitest run tests/lib/match-jerseys.test.ts` → FAIL (módulos no existen).
- [ ] **Step 3:** Implementar los dos módulos con las firmas de arriba.
- [ ] **Step 4:** Agregar el modelo al schema y escribir la migración SQL a mano (tabla, índices únicos, FKs con cascade). Luego `npx prisma generate`.
- [ ] **Step 5:** Re-ejecutar el test → PASS.
- [ ] **Step 6: Commit** — `feat: modelo MatchPlayerJersey y helpers de dorsal por partido`

### Task 2: Ruta `PUT /api/matches/[id]/jerseys`

**Files:**
- Create: `src/app/api/matches/[id]/jerseys/route.ts`
- Test: `tests/api/match-jerseys-route.test.ts`

**Interfaces:**
- Consumes: `setMatchJerseySchema`, patrón de auth de `src/app/api/matches/[id]/reopen/route.ts` (`requireMatchOrgRole(matchId, [REFEREE, ORG_ADMIN])`, 401 en `Unauthorized`, 403 si el rol es árbitro y no es el asignado).
- Produces: `PUT` con cuerpo `{ playerId, number }` → `200 { playerId, number }`; errores `400` (cuerpo inválido, partido no `SCHEDULED`, jugador fuera del partido), `403`, `409` (`"El dorsal N ya lo usa otro jugador de este equipo"`).

- [ ] **Step 1: Tests** (mockear `@/lib/db` y `@/lib/auth` con `vi.mock`): 200 al asignar (verifica `upsert` con `teamKey` = id del equipo local en liga); `number: null` hace `deleteMany` y responde 200; 400 con partido `LIVE` (y `upsert` no se llama); 400 si el jugador no es de ninguno de los dos equipos; 403 si el árbitro no es el asignado; 409 si ya existe ese número en el mismo `teamKey` para otro jugador; en amistoso, `teamKey` sale de `FriendlyMatchPlayer.side`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. `teamKey`: en liga, el `teamId` del jugador debe ser `homeTeamId` o `awayTeamId`; en amistoso, `side` de su `FriendlyMatchPlayer` en ese partido. Duplicado: buscar `findFirst({ matchId, teamKey, number, playerId: { not } })` antes del `upsert`, y capturar el error de unicidad de Prisma (`P2002`) como 409 por carrera.
- [ ] **Step 4:** Ejecutar → PASS.
- [ ] **Step 5: Commit** — `feat: el arbitro asigna el dorsal por partido`

### Task 3: Panel del árbitro (datos + editor móvil)

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/referee/match/[id]/page.tsx` (cargar `MatchPlayerJersey` del partido; pasar a cada jugador `jersey: number | null` = `effectiveJersey(...)` y `permanentJersey`)
- Modify: `src/components/referee/MatchControlPanel.tsx` (`RosterPlayer = { id; label; jersey: number | null; permanentJersey: number | null }`; usar `jerseyLabel` en los tres listados de jugadores; renderizar `JerseyEditor` mientras `status === 'SCHEDULED'`)
- Create: `src/components/referee/JerseyEditor.tsx`
- Test: `tests/components/jersey-editor.test.tsx`

**Interfaces:**
- Consumes: `jerseyLabel`, `PUT /api/matches/[id]/jerseys`, `readApiError` de `@/lib/api-error`.
- Produces: `JerseyEditor({ matchId, teamName, players, onChange })` donde `players: RosterPlayer[]` y `onChange(playerId: string, jersey: number | null): void` actualiza el estado del panel.

- [ ] **Step 1: Tests** del editor: un input numérico por jugador (`inputMode="numeric"`, `aria-label` con el nombre) con valor inicial `jersey` y `placeholder` = `permanentJersey`; al hacer `blur` con valor distinto llama `fetch` con `PUT` y `{ playerId, number }`, y `onChange`; vacío envía `number: null`; si la API responde 409 muestra el mensaje de error del servidor y restaura el valor anterior; sin cambios no llama `fetch`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar `JerseyEditor` (input grande, objetivo táctil ≥ 44 px, ordenado por dorsal ascendente con los sin dorsal al final) y conectarlo en el panel dentro de una sección «Dorsales del partido» por equipo. El título y los errores en es-CL con tuteo («Asigna el dorsal de cada jugador antes de iniciar el partido»). Al pasar a `LIVE` la sección desaparece.
- [ ] **Step 4:** Ejecutar la suite de componentes → PASS.
- [ ] **Step 5: Commit** — `feat: editor de dorsales en el panel del arbitro`

### Task 4: Dorsal del partido en timeline y lineup del admin

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/[id]/timeline/page.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/[id]/lineup/page.tsx` (líneas ~107 y ~134, hoy `c.player.jerseyNumber`)

**Interfaces:**
- Consumes: `effectiveJersey`, `jerseyLabel`; `db.matchPlayerJersey.findMany({ where: { matchId } })`.

- [ ] **Step 1:** Cargar los dorsales del partido en ambas páginas y construir los labels con `effectiveJersey(...)`. Mantener el orden actual.
- [ ] **Step 2:** `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
- [ ] **Step 3: Commit** — `feat: timeline y lineup usan el dorsal del partido`

### Task 5: Verificación final

- [ ] **Step 1:** `npx vitest run` completo → todo en verde.
- [ ] **Step 2:** `npx tsc --noEmit` → sin errores.
- [ ] **Step 3:** Probar en el navegador a ancho móvil: partido `SCHEDULED` muestra el editor y guarda; al iniciar el partido el editor desaparece y los selectores muestran `#dorsal`.
