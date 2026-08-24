# Dashboard de analítica por empresa — Design Spec

> Fecha: 2026-08-24  
> Producto: **LigaLab**  
> Depende de: tenant admin, amistosos (`FriendlyMatchPlayer`), eventos, MVP, clima de partido  
> Caso de referencia: **Partidos Los Lunes** (`loslunes`) — la org con más datos  
> Estado: **Diseño aprobado** (página nueva B; muro completo C; período 30 días A; un endpoint; clima incluido)

---

## 1. Objetivo

El home de admin (`/{slug}/admin`) está pensado para **liga por temporada**: equipos, tabla, goles de temporada y partidos `LEAGUE`. En una empresa como Los Lunes (amistosos, roster, pagos, galleta, DTs, clima) el panel no muestra el dato real.

Hace falta una **página de analítica** que, en 30 segundos, responda operación de la semana **y** palmarés del período, usando solo datos que ya existen.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Superficie | Página nueva `/{slug}/admin/estadisticas` | El home actual se queda como atajos operativos |
| Audiencia | `ORG_ADMIN` (+ bypass de platform admin ya existente) | Misma puerta que el resto del admin |
| Contenido | Muro completo: operación + palmarés + tendencia + clima | Los Lunes da para llenarlo; bloques vacíos se ocultan |
| Período default | Últimos **30 días** | Mezcla semana e historial reciente |
| Selector | `7` / `30` / `90` / `all` | Query `?period=` |
| Recorte | `Match.scheduledAt` en `America/Santiago` | Consistente con el resto de la app (`APP_TIMEZONE`) |
| Arquitectura | Una página + un endpoint | Mismo patrón que `/api/admin/dashboard` |
| Gráficos | SVG/CSS, sin librería nueva | YAGNI |
| Clima | Snapshot ya guardado en el partido | No fetch en vivo al cargar el muro |
| Universo | `LEAGUE` + `FRIENDLY` de la org | Los Lunes ≈ amistosos; Kelme ≈ liga |
| Rankings | Eventos / roster / MVP del período | No usar `Player.goals` (carrera, no período) |

### Alternativas descartadas

1. **Reemplazar el home de admin.** Mezcla atajos operativos con un muro denso; el usuario eligió página aparte.
2. **Dashboard de plataforma (todas las ligas).** Otro producto; v1 es por empresa.
3. **Widgets con fetch independiente.** Más resiliente, más código; no para v1.
4. **App de charts pesada.** Dependencia y tiempo de más.
5. **Default = todo el historial.** Enterra la operación semanal.
6. **Default = filtrar por categoría amistosa.** Útil después; el selector de período cubre v1.
7. **Pronóstico a 7 días / mapa.** Fuera de alcance; solo clima persistido.

---

## 3. Alcance

### Incluido

- Ruta `/{slug}/admin/estadisticas` (client fetch + skeleton + error/reintento).
- Item **Estadísticas** en el grupo Admin del nav unificado.
- `GET /api/admin/analytics?org={slug}&period=7|30|90|all`.
- Loader `getOrgAnalyticsDashboard(organizationId, period)` en `src/lib/admin-analytics.ts`.
- UI del muro (KPIs, operación, tendencia, palmarés, liga condicional, clima).
- Tests unitarios del loader (período, % pagado, ranking por eventos, bloques vacíos, period inválido).

### Excluido

- Rediseñar el home `/{slug}/admin`. Sí se agrega un link “Ver estadísticas” en la cabecera de ese home.
- Export CSV / Excel.
- Comparar ligas o drill-down cruzado (categoría + rango a la vez).
- Fetch de clima en vivo al abrir la página.
- App móvil Expo.
- E2E / Playwright en v1.

---

## 4. Rutas y contrato

### Página

`src/app/(tenant)/[organizationSlug]/(dashboard)/admin/estadisticas/page.tsx`

- `dynamic = 'force-dynamic'`
- Layout admin existente (ya exige `ORG_ADMIN`)
- Cliente: `AdminAnalyticsClient` (cloner del patrón `AdminDashboardClient`: timeout 25 s, `cache: 'no-store'`)
- Periodo se lee de `searchParams.period`; al cambiar el selector se navega a `?period=`

### API

`GET /api/admin/analytics`

| Query | Regla |
|-------|--------|
| `org` | Slug obligatorio; 400 si falta |
| `period` | `7` \| `30` \| `90` \| `all`. Cualquier otro valor → `30` |

Auth: `requireOrgRoleForSlug(org, [ORG_ADMIN])`.  
401 Unauthorized / 403 Forbidden / 500 genérico (`No se pudieron cargar las estadísticas`).

### Periodo

```
now = instante actual
from = startOfDay(now - N días) en APP_TIMEZONE   // N = 7 | 30 | 90
from = null                                        // all
matches = organizationId AND scheduledAt >= from   // si from != null
```

Cap de seguridad: si `all` (o cualquier período) supera **200** partidos, se toman los **200 más recientes** por `scheduledAt` y el payload incluye `truncated: true` + nota en UI (“Mostrando los 200 partidos más recientes”).

---

## 5. Modelo de datos (solo lectura)

No hay migración. Se agregan en memoria sobre:

| Fuente | Uso |
|--------|-----|
| `Match` | Tipo, estado, sede, scores, `scheduledAt`, clima, árbitro |
| `FriendlyMatchPlayer` | Convocatorias amistoso, `paid`, `isGalleta`, `isCoach` |
| `CallUp` | Convocatorias de liga |
| `MatchEvent` | `GOAL`, `OWN_GOAL`, `YELLOW_CARD`, `RED_CARD`; asistencias = `assistPlayerId` en `GOAL` |
| `MatchTeamMvp` | Palmarés MVP (`playerId` no nulo) |

**Próximo partido** (bloque operativo): el `SCHEDULED` más cercano con `scheduledAt >= now` de la org, **aunque esté fuera del período**. Si no hay, el bloque no se renderiza.

---

## 6. Payload (forma)

El loader devuelve un objeto estable. Los arrays vacíos significan “ocultar bloque”, no “mostrar tabla vacía con headers”.

```ts
type AnalyticsPeriod = '7' | '30' | '90' | 'all'

type OrgAnalyticsDashboard = {
  organizationName: string
  period: AnalyticsPeriod
  periodLabel: string          // "últimos 30 días" | "todo el historial"
  matchCount: number           // partidos considerados (tras cap)
  truncated: boolean
  kpis: AnalyticsKpi[]         // 3 o 4
  nextMatch: AnalyticsNextMatch | null
  pending: AnalyticsPendingItem[]
  unpaid: AnalyticsPersonStat[]          // top 8, paid=false en amistosos del período
  weekly: AnalyticsWeekBucket[]          // ocultar si length < 2
  weatherPeriod: AnalyticsWeatherPeriod | null  // null si < 2 partidos con clima
  rankings: {
    scorers: AnalyticsPersonStat[]
    assists: AnalyticsPersonStat[]
    appearances: AnalyticsPersonStat[]
    galleta: AnalyticsPersonStat[]
    mvp: AnalyticsPersonStat[]
    coaches: AnalyticsPersonStat[]
    cards: AnalyticsPersonStat[]         // amarillas+rojas; ocultar si vacío
  }
  league: {
    visible: boolean
    standingsPreview: Array<{ team: string; pts: number; gf: number; gc: number }>
    scorers: AnalyticsPersonStat[]
  }
}

type AnalyticsKpi = {
  label: string
  value: string
  unit: string
  delta: string
  foot: string
}

type AnalyticsPersonStat = {
  playerId: string
  name: string
  value: number
  meta: string                 // equipo / lado / "3 partidos"
}

type AnalyticsNextMatch = {
  id: string
  label: string                // "Equipo A vs Equipo B"
  when: string
  venue: string
  sideACount: number
  sideBCount: number
  paidCount: number
  rosterCount: number
  galletaName: string | null
  hasCoach: boolean
  weatherLine: string | null   // "Nublado · 14 °C · viento 12 km/h"
}

type AnalyticsPendingItem = {
  tone: 'danger' | 'warn'
  title: string
  href: string                 // ruta relativa tenant, ej. /admin/matches
}

type AnalyticsWeekBucket = {
  weekLabel: string            // "12–18 ago"
  matches: number
  goals: number
}

type AnalyticsWeatherPeriod = {
  avgTempC: number
  minTempC: number
  maxTempC: number
  topLabels: string[]          // hasta 2 etiquetas más repetidas
}
```

---

## 7. UI — orden del muro

Identidad **Cancha de noche** (tokens `night` / `turf` / `line` / `flood` / `mist`, `DashPageHeader`, `card-kelme`, `font-data` para números).

1. **Cabecera:** título “Estadísticas”, subtítulo `{org} · {periodLabel} · {N} partidos`, selector 7 / 30 / 90 / Todo.
2. **KPI (grid 4 → 2 → 1):**
   - Partidos FINISHED vs programados (SCHEDULED/LIVE/HALFTIME) en el período.
   - Convocatorias: filas `FriendlyMatchPlayer` + `CallUp` del período.
   - Cobro: `% pagado` entre filas amistosas del período + “N adeudan”. Si no hay filas amistosas, esta card se reemplaza por **Jugadores distintos** (únicos en roster/callup).
   - Goles: suma `homeScore+awayScore` de FINISHED + goles/partido.
3. **Operación (2 columnas):**
   - Izquierda: próximo partido (cupos A/B, pagos, galleta, DT, clima). Link a `/{slug}/live/{id}`.
   - Derecha: pendientes (sin DT / sin sede / sin MVP en FINISHED del período) + lista top 8 impagos con link a jugadores o al partido.
4. **Tendencia:** barras CSS/SVG (partidos + goles por semana). Ocultar si hay menos de 2 buckets con dato.
5. **Clima del período:** promedio / min / max °C + hasta 2 etiquetas. Ocultar si hay menos de 2 partidos con `weatherLabel` y `weatherTempC`.
6. **Palmarés:** grid 2×2 (desktop) de tablas top 8. Cada tabla se oculta si está vacía. Click en fila → `/{slug}/admin/players` (v1 no abre ficha individual si no hay ruta estable).
7. **Liga:** solo si existe al menos un `LEAGUE` en el set. Mini puntos (pts / GF / GC) + goleadores de liga del período (eventos en esos partidos). En Los Lunes no se muestra.

Estados:

- Cero partidos en el rango: mensaje “No hay partidos en estos N días” + link a `/{slug}/admin/matches`.
- Error API: card de reintento (copy alineado al home).
- `truncated`: nota bajo el subtítulo, no un modal.

---

## 8. Reglas de cálculo

- **% pagado:** `paid=true / total FriendlyMatchPlayer` del período. 0 denominador → card reemplazada, no “NaN%”.
- **Goleadores:** contar `MatchEvent` tipo `GOAL` (no `OWN_GOAL`) con `playerId`.
- **Asistencias:** contar `assistPlayerId` no nulo en eventos `GOAL`.
- **Apariciones:** 1 por (`matchId`, `playerId`) en `FriendlyMatchPlayer` o `CallUp`.
- **Galleta / DT:** contar flags `isGalleta` / `isCoach` en el período.
- **MVP:** contar `MatchTeamMvp.playerId` no nulo.
- **Fair play:** `YELLOW_CARD` + `RED_CARD` por `playerId`; tabla oculta si el total es 0.
- **Clima próximo:** `formatWeatherLine` existente (`match-weather.ts`). Si no hay snapshot: `weatherLine = null` y la UI dice “Sin clima (falta comuna)”.
- **Clima período:** solo partidos con `weatherTempC != null` y `weatherLabel`; promedio redondeado a 1 decimal.
- **Pendiente “sin MVP”:** partidos `FINISHED` del período (cualquier tipo) sin ninguna fila `MatchTeamMvp` con `playerId`.
- **Pendiente “sin DT”:** amistosos del período (o el próximo) sin `isCoach=true`.
- **Pendiente “sin sede”:** `venue` y `communeName` ambos null.

Nombres: `playerDisplayName` / `matchDisplayName` ya usados en el home.

---

## 9. Archivos previstos

| Archivo | Rol |
|---------|-----|
| `src/lib/admin-analytics.ts` | Tipos + loader + helpers de período/agregación (testeable) |
| `src/app/api/admin/analytics/route.ts` | GET auth + period |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/estadisticas/page.tsx` | Página |
| `src/components/admin/AdminAnalyticsClient.tsx` | Fetch + estados |
| `src/components/admin/AdminAnalyticsHome.tsx` | Layout del muro |
| `src/lib/tenant-nav.ts` | Link Estadísticas |
| `tests/lib/admin-analytics.test.ts` | Unit del loader |

Reutilizar primitivos `DashPageHeader` / cards noche. En `AdminDashboardHome` agregar solo el link “Ver estadísticas” hacia `/{slug}/admin/estadisticas`; no cambiar KPIs ni paneles del home.

---

## 10. Tests

`tests/lib/admin-analytics.test.ts` (funciones puras extraídas: `resolveAnalyticsPeriod`, `paidRate`, `rankByCount`, `shouldShowBlock`, `weatherPeriodSummary`):

1. `period=foo` → `30`; `all` → `from = null`.
2. `% pagado` 3/4 = 75; 0/0 no explota.
3. Goleador usa eventos `GOAL`, ignora `OWN_GOAL` y `Player.goals`.
4. Ranking vacío → `shouldShowBlock` false.
5. Clima período null si hay 0 o 1 snapshot; con 2 calcula min/max/avg.
6. Cap: 201 partidos → `truncated` y 200 filas.

La ruta API se cubre solo si ya hay patrón barato de mock auth; no es obligatorio en v1.

---

## 11. Fuera de esta spec

- Rediseñar KPIs del home de admin.
- Analytics para jugador / DT / árbitro.
- Persistencia de “favoritos” o widgets configurables.
