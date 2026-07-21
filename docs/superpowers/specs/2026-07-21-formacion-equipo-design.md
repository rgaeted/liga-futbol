# Formación de equipo — Design Spec

> Estado: **Plan listo**  
> Fecha: 2026-07-21  
> Motivación: hoy solo existe “titular/suplente” en citaciones de liga. Se necesita una **formación** (esquema + posiciones en cancha) para **todos** los partidos (liga y amistoso).

---

## 1. Objetivo

Permitir definir, por cada lado del partido:

1. El **esquema** (ej. `4-3-3`, `4-4-2`, `3-5-2`)
2. Qué jugadores ocupan cada **slot** del esquema (titulares)
3. Quiénes quedan en el **banco**
4. Ver esa formación en **live** (y editarla desde coach/admin según el tipo)

## 2. Decisiones

| Tema | Decisión |
|------|----------|
| Qué es “formación” | Esquema + slots en cancha (no solo un string suelto) |
| Alcance | Liga **y** amistoso |
| Cantidad de titulares | Hasta **11** slots según el esquema; el banco son convocados sin slot |
| Quién edita (liga) | **Coach** de cada equipo (su lado); admin puede editar ambos |
| Quién edita (amistoso) | **Admin** por lado A/B (junto al plantel del partido) |
| Live | Sección “Formaciones” debajo del marcador, ambos lados |
| Esquemas soportados (v1) | `4-4-2`, `4-3-3`, `3-5-2`, `4-2-3-1`, `5-3-2` |
| Amistosos con menos de 11 | Se puede guardar con slots vacíos; live muestra solo ocupados |
| Fuera de alcance v1 | Arrastrar en cancha en tiempo real, cambios de formación mid-match vía eventos, apps nativas |

## 3. Modelo de datos

### 3.1 `MatchFormation` (uno por lado)

```prisma
model MatchFormation {
  id        String   @id @default(cuid())
  matchId   String
  match     Match    @relation(...)
  /// Liga: teamId del home/away. Amistoso: null
  teamId    String?
  /// Amistoso: A | B. Liga: null
  side      FriendlySide?
  scheme    String   // "4-3-3"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([matchId, teamId])
  @@unique([matchId, side])
}
```

Invariantes (app):

- `LEAGUE` → `teamId` requerido, `side` null, `teamId` ∈ {home, away}
- `FRIENDLY` → `side` requerido, `teamId` null

### 3.2 Extender participaciones

**`CallUp`**

| Campo | Cambio |
|-------|--------|
| `slotKey` | Nuevo `String?` — ej. `GK`, `LB`, `CB_L`, `CB_R`, `RB`, `CM_L`, … |
| `isStarter` | Se mantiene; si hay `slotKey` ⇒ titular |

**`FriendlyMatchPlayer`**

| Campo | Cambio |
|-------|--------|
| `isStarter` | Nuevo `Boolean @default(false)` |
| `slotKey` | Nuevo `String?` |

Reglas:

- `slotKey` no nulo ⇒ `isStarter = true`
- Un `slotKey` único por lado/equipo en el partido
- Jugadores en banco: convocados/`FriendlyMatchPlayer` sin `slotKey`

### 3.3 Catálogo de esquemas (código, no DB)

`src/lib/formations.ts`:

```ts
export const FORMATION_SCHEMES = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'] as const

// Cada scheme → lista ordenada de slots con { key, label, row, col }
// row 0 = arco propio (abajo en vista del equipo), row N = delantera
```

## 4. Flujos

### Liga

1. Coach abre citación del partido (ya existe `/coach/callups/[matchId]`).
2. Elige esquema → aparece cancha con slots.
3. Selecciona convocados; arrastra o elige jugador por slot; resto = banco.
4. Guarda: `CallUp` (con `slotKey`/`isStarter`) + `MatchFormation` de su equipo.
5. **Fix obligatorio:** `POST /api/callups` solo borra/recrea callups **del equipo del coach**, no del rival.

### Amistoso

1. Admin crea partido con plantel (como hoy) **o** edita formación después en página dedicada `/admin/matches/[id]/lineup`.
2. Por lado A/B: esquema + slots desde el plantel de ese lado.
3. Guarda: `FriendlyMatchPlayer.isStarter`/`slotKey` + `MatchFormation`.

### Live

- Si hay `MatchFormation` (o al menos starters con slot), mostrar diagramas lado a lado.
- Sin formación: ocultar sección (no romper partidos viejos).

## 5. APIs

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/api/matches/[id]/formations` | público (live) |
| `PUT` | `/api/matches/[id]/formations` | COACH (solo su team) / ADMIN |

Body PUT (liga):

```json
{
  "teamId": "...",
  "scheme": "4-3-3",
  "slots": [{ "slotKey": "GK", "playerId": "..." }],
  "benchPlayerIds": ["..."]
}
```

Body PUT (amistoso): `side` + `friendlyPlayerId` en slots/bench.

## 6. UI

| Superficie | Componente |
|------------|------------|
| Editor cancha (compartido) | `src/components/lineup/FormationPitch.tsx` |
| Coach | integrar en `CallUpForm` o página lineup hermana |
| Admin amistoso | `/admin/matches/[id]/lineup` |
| Live | bloque en `LiveScoreboard` |

## 7. Migración

- Columnas nuevas nullable → partidos existentes siguen válidos.
- Sin backfill de esquemas (formación vacía hasta que alguien la guarde).
