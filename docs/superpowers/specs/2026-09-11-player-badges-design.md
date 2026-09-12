# Badges de jugador (insignias automáticas) — Design Spec

> Estado: **Diseño aprobado en sesión**
> Fecha: 2026-09-11
> Producto: **LigaLab**
> Fuente original: `docs/superpowers/mocks/2026-09-11-player-badges/ligalab-badges-spec.md`
> Maqueta: `docs/superpowers/mocks/2026-09-11-player-badges/badges-galeria.html`
> Plan: [`docs/superpowers/plans/2026-09-11-player-badges.md`](../plans/2026-09-11-player-badges.md)

---

## 1. Objetivo

Reconocimientos **automáticos** por hechos reales del partido (goles, asistencias, presencia, MVP, tarjetas, autogoles). Cada instancia cuenta una noche: *“Minuto 58' · Blancos 5-4”*.

Principio (igual que las cartas): **se ganan en la cancha, nunca se compran ni se otorgan por usar la app.** Voz de camarín: pícara, cálida, nunca humillante.

**Premios del Camarín** (`OrgAward` / `PlayerAward`) no se tocan. Son títulos editoriales. Badges son otra familia.

---

## 2. Decisiones

| Tema | Elección |
|------|----------|
| Alcance v1 | Motor + persistencia + backfill + vitrina pública + fila en la carta Los Lunes + admin de catálogo |
| Orgs | Multi-tenant. Flag `badgesEnabled` por org. Prod arranca **solo `loslunes` en `true`**. Kelme / infantil apagados. **No usar este catálogo con menores (<15).** |
| Catálogo | CRUD de filas por org, cada una atada a un `predicateId` del set de 34. El admin no inventa predicados. |
| Qué edita el admin | Nombre, descripción, familia (display), rareza, icono, umbrales JSON, activo, orden. Crear = elegir un `predicateId` libre. No borrar si hay otorgamientos: desactivar. |
| Vitrina | Página pública `/{slug}/jugador/{playerId}`: carta FIFA solo si `loslunes`; galería si `badgesEnabled`. Catálogo completo: no ganadas en gris; no evaluables *Próximamente*. |
| Otorgamiento | Al pasar a `FINISHED` y al re-editar esa fecha (`reconcileMatchState`). Backfill al prender la org. |
| Umbrales nuevos | No reescriben historial. Valen para partidos futuros y para el recálculo de **esa** fecha si la editan. |
| Cálculo | Instancias persistidas (`PlayerBadge`). No al vuelo. |
| Fuera de v1 | Notificación push, imagen share del badge, bloque “insignias de la fecha” en landing/WhatsApp, XP/niveles, constructor de reglas, set infantil. |

### Alternativas descartadas

1. Reusar `OrgAward` / `PlayerAward`.
2. Calcular badges al leer, sin tabla.
3. Recalcular todo el historial al cambiar umbrales.
4. Vitrina solo en el panel logueado.

---

## 3. Arquitectura

```text
Registro en código (34 predicados + defaults + evaluable?)
        │
        ▼
OrgBadge (catálogo por org)     Organization.badgesEnabled
        │
        ▼
FINISHED match  →  evaluarBadges(match)  →  PlayerBadge (instancias)
        │
        ├── GET /{slug}/jugador/{playerId}   (vitrina + carta si loslunes)
        ├── fila en PlayerCard (recientes ganadas)
        └── /{slug}/admin/badges             (CRUD + prender org)
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `BADGE_REGISTRY` | Ids, predicado puro, umbrales default, `evaluable`, `repeatable`, familia, icono | Tests + seed + admin “añadir” | Eventos, roster, MVP, historial de la org |
| `evaluarBadgesDePartido` | Recorre catálogo activo y evaluable; crea/borra instancias de **ese** `matchId` | `reconcileMatchState` si `FINISHED`; backfill | `OrgBadge` + registry |
| `OrgBadge` / `PlayerBadge` | Persistencia | Prisma | Migración nueva |
| Vitrina | Pinta catálogo + instancias; no calcula reglas | Página pública | Maqueta HTML |
| Admin | CRUD filas + flag + seed/backfill | ORG_ADMIN | Igual patrón que `/admin/awards` |

El front **no** decide si un badge se ganó.

---

## 4. Modelo de datos

Migración Prisma (sí, a diferencia de la carta).

### `Organization`

- `badgesEnabled Boolean @default(false)`

Al pasar de `false` → `true`: si no hay `OrgBadge`, sembrar las 34 desde el registro; luego backfill de partidos `FINISHED` de esa org (amistosos y liga), en orden cronológico.

### `OrgBadge`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | cuid | |
| `organizationId` | FK | Cascade |
| `predicateId` | string | Id del set. Unique `(organizationId, predicateId)` |
| `name` | string | |
| `description` | string | |
| `family` | string | `clutch` \| `goleador` \| `creador` \| `muralla` \| `constancia` \| `camarin` \| `hitos` |
| `rarity` | string | `comun` \| `raro` \| `epico` \| `legendario` |
| `iconKey` | string | Clave SVG del set de la maqueta |
| `thresholds` | Json | Umbrales numéricos (ver §6) |
| `isActive` | bool | Si el motor la evalúa |
| `sortOrder` | int | |
| `createdAt` / `updatedAt` | DateTime | |

Si `registry.evaluable === false`, el motor **nunca** otorga aunque `isActive`. La vitrina muestra *Próximamente*.

No `onDelete: Cascade` desde `OrgBadge` hacia instancias si el admin “borra”: **prohibido borrar** cuando `PlayerBadge` count > 0. Solo `isActive = false`.

### `PlayerBadge`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | cuid | |
| `organizationId` | FK | Denormalizado |
| `playerId` | FK | |
| `orgBadgeId` | FK | Restrict |
| `matchId` | FK | El partido que disparó el hecho |
| `context` | string | Historia corta para la UI |
| `awardedAt` | DateTime | `scheduledAt` del partido (no `now()` del backfill) |

**Unique:** `(playerId, orgBadgeId, matchId)` — repetible en varias fechas, no dos veces la misma noche.

Hitos no repetibles (`primer_gol`, `club_50`, …): el predicado consulta si ya existe alguna instancia para ese `orgBadgeId`+`playerId` y no vuelve a disparar.

Recálculo de una fecha: `deleteMany` de `PlayerBadge` con ese `matchId` **solo para badges cuyo predicado es de partido** (todas menos hitos/constancia de carrera que se re-evalúan distinto — ver §5). Luego re-evaluar.

---

## 5. Motor

### Entrada por partido

Partido `FINISHED` de una org con `badgesEnabled`:

- Eventos ordenados por `minute` ASC, `createdAt` ASC
- Roster: `FriendlyMatchPlayer` si `FRIENDLY`; `CallUp` si `LEAGUE`
- Marcador corrido con la misma lógica que `computeScoresFromEvents` / `buildTimelineScoresAfter`
- MVP: `MatchTeamMvp`
- `minutoTotal = max(1, minuto de FULLTIME si existe, máximo `minute` de eventos, 60)` — 60 es piso para Los Lunes si la planilla quedó corta
- Primer tiempo: minuto de `HALFTIME` si existe; si no, `floor(minutoTotal / 2)`

Presencia (constancia): estar en el roster del partido finalizado. No `MatchAttendance`.

Goles que cuentan: `isScoringGoalEvent` (`GOAL`, `PENALTY_GOAL`). Autogol no suma como gol a favor del autor.

### Recálculo de esa fecha

1. Borrar `PlayerBadge` de ese `matchId`.
2. Evaluar predicados **de partido** (clutch, goleador de la noche, creador, muralla de la noche, camarín de la noche, hito si el umbral se cruza **en este partido**).
3. Predicados de **racha / mes / temporada / carrera** se evalúan al final de este partido mirando historial **ya persistido + este partido**, y:
   - si ahora califica y no tiene instancia (no repetible) o no la tiene en este match (repetible de racha) → otorgar con este `matchId`
   - si se borró la de este `matchId` y ya no califica, no se re-crea
   - instancias de **otras** fechas no se tocan (umbrales viejos y rachas cerradas en otro lunes quedan)

### Backfill

Partidos `FINISHED` de la org, `scheduledAt` ASC. Por cada uno, la misma función que al cerrar planilla. Un jugador recibe el hito en el partido en que cruzó el umbral, no en todos los posteriores.

Idempotente: unique `(playerId, orgBadgeId, matchId)`.

### Contexto (copy)

Ejemplos fijos en español chileno:

- Gol clutch: `{minuto}' · {ladoA} {golesA}-{golesB} {ladoB}`
- Hat-trick: `{n} goles · {ladoA} {marcador}`
- Racha: `{n} lunes seguidos`
- Hito: `Gol {n} en el club`
- Autogol: tono suave, nunca burla (`Uy. Le puede pasar a cualquiera.` como subtítulo de catálogo; contexto = fecha + marcador)

---

## 6. Set inicial (34) y evaluable en v1

Umbrales entre `<>` son keys en `OrgBadge.thresholds`. Defaults = Los Lunes.

### Evaluables (el motor otorga)

| predicateId | Nombre default | Rareza | Default umbral | Predicado (resumen) |
|-------------|----------------|--------|----------------|---------------------|
| `gol_ultima_hora` | Gol de Última Hora | epico | `ultimoPct: 15`, `ganaPor: 1` | Gol a favor en el último X% y su lado gana por exactamente 1 |
| `heroe_remontada` | Héroe de la Remontada | legendario | `abajoPor: 2` | Anota o asiste yendo abajo ≥N; su lado termina ganando |
| `mano_helada` | Mano Helada | raro | `ultimoCuartoPct: 25` | Gol que rompe empate en el último cuarto |
| `doblete_express` | Doblete Exprés | epico | `goles: 2`, `minutos: 10` | N goles propios con ≤M minutos entre el primero y el último del ráfaga |
| `el_ultimo_en_rendirse` | El Último en Rendirse | raro | `abajoPor: 3` | Participa (gol o asistencia) yendo abajo ≥N |
| `hat_trick` | Hat-Trick | epico | `goles: 3` | N goles a favor en el partido |
| `poker` | Póker | legendario | `goles: 4` | ≥N goles a favor en el partido |
| `abrio_la_lata` | Abrió la Lata | comun | — | Autor del primer gol a favor del partido |
| `sentencio` | Sentenció | comun | `diferencia: 3` | Gol que deja a su lado con diferencia ≥N |
| `verdugo` | Verdugo | raro | `goles: 3` | ≥N goles a favor al mismo rival en esa noche |
| `arquitecto` | El Arquitecto | epico | `asistencias: 3` | ≥N asistencias en el partido |
| `sociedad` | Sociedad Anónima | raro | `asistencias: 3` | ≥N asistencias al mismo goleador esa noche |
| `taco_de_oro` | Taco de Oro | raro | — | ≥1 gol y ≥1 asistencia en el mismo partido |
| `bandeja_de_plata` | Bandeja de Plata | comun | — | Primera asistencia de ese jugador en esa noche (si hay al menos una) |
| `valla_invicta` | Valla Invicta | epico | — | Su lado recibe 0 goles. Se otorga a jugadores con posición POR (`cardPositionFromPlayer`); si el lado no tiene POR en roster, no se otorga |
| `muro` | El Muro | raro | `golesRecibidosMax: 1` | POR de un lado que **gana** recibiendo ≤N |
| `pichanga_limpia` | Pichanga Limpia | comun | — | Su lado gana y recibió 0 goles en el primer tiempo. Se otorga al roster de ese lado |
| `nunca_falla` | Nunca Falla | epico | `lunesSeguidos: 8` | Racha de presencia ≥N al cierre de este partido |
| `puntual` | Puntual | comun | `lunesSeguidos: 4` | Racha de presencia ≥N |
| `todoterreno` | Todoterreno | raro | — | Jugó todas las fechas `FINISHED` de su org en el mes calendario Chile de este partido (mín. 1 fecha) |
| `el_fundador` | De la Vieja Escuela | legendario | `partidos: 100` | Alcanza N partidos en la org (roster FINISHED) |
| `en_contra` | Cambio de Camiseta | comun | — | Autor de `OWN_GOAL` |
| `caballero` | Juego Limpio | raro | — | Al **cerrar el año calendario Chile**, 0 amarillas y 0 rojas en partidos de ese año, con ≥1 PJ ese año. Se otorga una vez por año (matchId = último FINISHED del año en que se evalúa) |
| `tarjetero` | Coleccionista de Amarillas | comun | `amarillas: 3` | Alcanza N amarillas en el año calendario Chile |
| `el_show` | Cara de la Fecha | raro | — | Está en `teamMvps` del partido |
| `club_50` | Club de los 50 | epico | `goles: 50` | Cruza N goles históricos a favor en la org |
| `centurion_asist` | Centurión | epico | `asistencias: 50` | Cruza N asistencias históricas |
| `kilometrero` | Kilometrero | raro | `partidos: 25` | Cruza N partidos (el `predicateId` en el mock original era `mil_minutos`; v1 usa partidos, no minutos) |
| `primer_gol` | Se Abrió la Cuenta | comun | — | Primer gol a favor en la org |

Hat-trick y póker pueden ganarse la misma noche (4 goles → ambos) si ambos están activos.

`bandeja_de_plata` es por partido (primera asistencia de *esa* noche), repetible entre fechas.

### No evaluables en v1 (*Próximamente* en vitrina; el motor no otorga)

| predicateId | Por qué |
|-------------|---------|
| `de_todos_los_sabores` | No hay tipo de gol (zurda / derecha / cabeza) |
| `salvador` | No hay evento “atajada de penal” (`MISSED_PENALTY` no identifica al arquero) |
| `sin_excusas` | Spec pide marca manual del organizador, no el clima auto del partido |
| `bombero` | Amistosos no tienen titular/suplente fiable (`CallUp.isStarter` no aplica al roster friendly) |

El admin puede tener la fila (se siembra igual); `evaluable: false` en el registro manda.

Rareza de hat-trick: el mock/spec original la deja épica. Calibrar después con datos reales no es de v1.

---

## 7. Página pública y carta

### Ruta `/{slug}/jugador/{playerId}`

Pública (proxy GET/HEAD ya cubre `/{slug}/jugador/{id}`).

404 si:

- el jugador no es de esa org, o
- org pausada (layout 503 ya existe), o
- **no** es `loslunes` **y** `badgesEnabled === false`

Si `slug === loslunes`: render de `PlayerCard` + share (como hoy).

Si `badgesEnabled`: debajo (o sola, si no hay carta) la **vitrina** agrupada por familia, leyenda de rarezas, copy *Se ganan en la cancha*. Visual: maqueta `badges-galeria.html` (noche, Anton/Barlow, discos por rareza, `locked` gris).

Contador: `{ganadasDistintas} de {filasDelCatalogo} insignias` (una predicado cuenta 1 aunque sea repetible). Repetibles muestran `×N` y el **último** `context`.

Iconos: SVG monolínea del mock, mapeados por `iconKey`. No emojis del catálogo de Premios.

### Fila en la carta (solo Los Lunes)

Bajo los 6 atributos, hasta **4** `PlayerBadge` más recientes (por `awardedAt` desc). Disco chico + rareza. Sin locked. Link implícito: ya estás en la misma página que la vitrina.

### Panel `/{slug}/player`

Si `badgesEnabled`, link **Ver mis insignias** → `/{slug}/jugador/{player.id}` (junto a **Ver mi carta** en Los Lunes).

### Landing

v1 **no** añade bloque de insignias de la fecha. Rankings siguen yendo a la carta/vitrina.

---

## 8. Admin

Ruta `/{slug}/admin/badges`. Solo `ORG_ADMIN`.

- Switch **Insignias automáticas** → `badgesEnabled`. Al prender: seed si vacío + backfill (job síncrono en request si el historial es chico, típico Los Lunes; si >100 partidos, misma request igual — Los Lunes no llega). No hay cola.
- Lista de `OrgBadge`: activo, rareza, umbrales editables, *Próximamente* si `!evaluable`.
- **Añadir:** select de `predicateId` que esa org aún no tiene.
- No hay “otorgar a mano”. Eso sigue siendo Premios del Camarín.

API (mismo estilo que org-awards):

- `GET/POST /api/org-badges`
- `PATCH /api/org-badges/[id]` (no DELETE si hay instancias)
- `PATCH /api/org-badges/settings` body `{ badgesEnabled: boolean }`

---

## 9. Copy y rareza (UI)

| Rareza | Disco / borde |
|--------|----------------|
| común | hielo/gris, sin glow |
| raro | verde `#3DE68C` |
| épico | oro `#E8C878` + glow suave |
| legendario | conic oro + glow fuerte (como marco de carta) |

Textos de UI en español chileno, tú. Pícaros (`en_contra`, `tarjetero`) autoconscientes. Si un copy humilla, se reformula; no se publica así.

No importar `tokens.css` del mock en `globals.css`. Anton/Barlow ya están por la carta; la vitrina las reutiliza.

---

## 10. Tests

Vitest sobre predicados puros con fixtures (marcador corrido, minutos, roster). Casos mínimos:

- Opitz 7 goles / 3 PJ no dispara hat-trick por ventana: hat-trick es **por partido**, no 30d
- 3 goles en un partido → `hat_trick`; 4 → también `poker`
- Gol al 58' con `minutoTotal` 60 y gana 5-4 → `gol_ultima_hora`
- Autogol no cuenta para hat-trick ni `primer_gol`
- `OWN_GOAL` → `en_contra` al autor
- Racha presencia: lista de flags → `nunca_falla` / `puntual`
- Recálculo: quitar un gol y re-evaluar borra el hat-trick de ese `matchId`
- Unique: segundo eval del mismo partido no duplica
- Predicado `de_todos_los_sabores` nunca otorga
- Org con `badgesEnabled: false` no escribe instancias
- Página: no-loslunes sin flag → 404; con flag sin carta FIFA pero con vitrina

---

## 11. Fuera de v1

- XP y nivel de jugador
- Notificación “Ganaste X” + PNG share del badge
- Resumen de la fecha en landing / WhatsApp
- Tipo de gol, atajada de penal, clima manual, suplentes
- Catálogo distinto para fútbol formativo
- Recalcular historial al cambiar umbrales
- App Expo

---

## Self-review

- Sin TBD. `mil_minutos` del mock queda como `kilometrero` con umbral de partidos (el dato que existe).
- Premios vs badges no se mezclan.
- Recálculo acotado a `matchId`; umbrales nuevos no reescriben otras fechas.
- Un solo plan de implementación cubre motor + migración + admin + vitrina + gancho en reconcile.
