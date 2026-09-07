# Copa Kelme Los Lagos — Design Spec

> Plan: [`docs/superpowers/plans/2026-08-31-copa-kelme-los-lagos.md`](../plans/2026-08-31-copa-kelme-los-lagos.md)
> Fecha: 2026-08-31
> Producto: **LigaLab**
> Org: **Torneos Kelme** (`slug: kelme`)
> Estado: **Aprobado en sesión** (variante 4/6 pendiente de elegir al sembrar)

---

## 1. Objetivo

Configurar la **Copa Kelme Los Lagos** en el sistema actual de temporadas (no una org nueva, no un motor de copas). Un admin elige **4 o 6 equipos** al sembrar. La copa es **infantil**, **fútbol 7**, con fase de liga/grupos y una categoría **Finales** para que el partido decisivo no sume puntos a la fase previa.

Fuente de fixture y costos: `Copa Kelme Los Lagos.xlsx` (punto de equilibrio + bosquejo). Los costos **no** entran al producto. Los nombres de clubes del Excel son **placeholders** (Colo Colo, Católica, Unión, FV, Austral + Club 6).

---

## 2. Decisiones

| Tema | Elección |
|------|----------|
| Dónde vive | Temporada nueva en org `kelme`. URL admin `/kelme/admin`. Landing sigue `/kelme`. |
| Variantes | `--variant=4` o `--variant=6`. No se implementa la hoja “6 FECHAS” (todos contra todos de 6). |
| Categoría | Infantil / juvenil. Nombres de catálogo propios de la copa (no reutilizar Senior/+35). |
| Formato | `FUTBOL_7` |
| Definición | Grupos o liga + finales en categoría aparte (recomendación C). |
| Planteles | **No** sembrar 15 niños ficticios en Kelme. Equipos vacíos; el admin carga jugadores después. |
| UI nueva | No. Wizard de temporada/partido y listado admin ya existen. |
| Brackets nativos | No. “Finales” es otra `FriendlyCategory` + partidos `LEAGUE`. |
| Finanzas / gastos | Fuera de alcance. |
| App móvil | No publicar edición en este trabajo. Se puede configurar después en `/kelme/admin/seasons/[id]/mobile`. |

### Alternativas descartadas

1. **Org nueva** (`kelme-cup-los-lagos`). El usuario eligió temporada en Kelme.
2. **Mini-liga sola** (una tabla, sin finales). No se siente copa; la 4.ª fecha del Excel no encaja.
3. **Amistosos para la final.** Pierde clubes `Team`, inscripción y tabla de la copa.
4. **Niños demo.** Contamina el plantel real de Kelme.

---

## 3. Modelo en LigaLab (sin cambio de schema)

```text
Organization kelme
  FriendlyCategory
    "Copa Los Lagos Infantil"      ← solo variant=4
    "Copa Los Lagos Grupo A"       ← solo variant=6
    "Copa Los Lagos Grupo B"       ← solo variant=6
    "Copa Los Lagos Finales"       ← ambas
  Team[]                           ← 4 o 6 clubes placeholder
  Season "Copa Kelme Los Lagos"
    footballFormat = FUTBOL_7
    SeasonCategory[] → las categorías de arriba
      SeasonTeam[] (REGISTERED, roster vacío)
      Match LEAGUE (fase grupos / RR)
      Match LEAGUE (fase finales, después)
```

Una tabla del dashboard = una `SeasonCategory`. Por eso los grupos de 6 equipos son **dos categorías**, no un campo “grupo”.

---

## 4. Variante 4 equipos (hoja CORTO 4 eq)

**Clubes (orden 1–4):** Colo Colo, Católica, Unión, FV.

**Categorías de temporada:** Infantil + Finales.

**Fase liga — 3 fechas, 2 partidos por fecha** (cada club juega una vez por fecha):

| Fecha | Partido 10:00 | Partido 11:15 |
|-------|---------------|---------------|
| 1 | Colo Colo vs Católica | Unión vs FV |
| 2 | Colo Colo vs Unión | Católica vs FV |
| 3 | Colo Colo vs FV | Católica vs Unión |

Son los 6 emparejamientos del Excel (1-2, 3-4, 1-3, 2-4, 1-4, 2-3).

**Fase finales — 1 fecha** (cuando los 6 partidos estén `FINISHED`):

| Hora | Partido | Cómo se arma |
|------|---------|--------------|
| 10:00 | 3.º vs 4.º | 3.er y 4.º de la tabla Infantil |
| 11:15 | Final | 1.º vs 2.º de la tabla Infantil |

Criterio de tabla (igual que `admin-dashboard-standings`): puntos (3/1/0), luego diferencia de goles, luego goles a favor, luego nombre `es-CL`.

---

## 5. Variante 6 equipos (hoja CORTO 6 eq)

**Clubes:** Colo Colo, Católica, Unión, FV, Austral, **Club 6** (el Excel solo lista 5 nombres).

**Grupos fijos:**

| Grupo A | Grupo B |
|---------|---------|
| Colo Colo | FV |
| Católica | Austral |
| Unión | Club 6 |

**Categorías:** Grupo A, Grupo B, Finales.

**Fase grupos — 3 fechas, 2 partidos por fecha** (un partido por grupo; el tercero descansa):

| Fecha | 10:00 Grupo A | 11:15 Grupo B |
|-------|---------------|---------------|
| 1 | Colo Colo vs Católica | FV vs Austral |
| 2 | Colo Colo vs Unión | FV vs Club 6 |
| 3 | Católica vs Unión | Austral vs Club 6 |

**Semifinales — 1 fecha** (grupos terminados):

| Hora | Partido |
|------|---------|
| 10:00 | 1.º A vs 2.º B |
| 11:15 | 1.º B vs 2.º A |

**Cierre — 1 fecha** (semis `FINISHED`):

| Hora | Partido |
|------|---------|
| 10:00 | Perdedores → 3.er puesto |
| 11:15 | Ganadores → Final |

Empate en semi: el seed de cierre **no** corre; el admin define ganador en cancha (no hay penales en el modelo). El script exige un ganador (marcador distinto).

---

## 6. Calendario, cancha y árbitro

- Primera fecha: CLI `--start=YYYY-MM-DD` (obligatorio al persistir). Fechas siguientes = +7 días por ronda.
- Horarios Chile: `10:00` y `11:15` vía `scheduleInputToIso` (`America/Santiago`).
- Ubicación por defecto: región `10` Los Lagos, comuna `10109` Puerto Varas.
- Recinto: `--venue=...` o `"Por confirmar"`.
- Eventos de árbitro: preset **Básico** (gol, amarilla, roja) — copa infantil.

---

## 7. Seed (única pieza de código nueva)

Script idempotente `scripts/seed-copa-kelme-los-lagos.ts`, patrón Prisma de `seed-liga-le-park.ts` (`createPrismaClient`).

```text
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=4 --phase=grupos --start=2026-09-05 --dry-run
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=4 --phase=grupos --start=2026-09-05
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=4 --phase=finales --start=2026-09-26
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=6 --phase=grupos --start=2026-09-05
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=6 --phase=finales --start=2026-09-26
```

`--phase=finales` en variant 6 crea **semis** o **cierre**, lo que corresponda según partidos `FINISHED` ya existentes. No adelanta el cierre si faltan semis.

**Idempotencia**

- Org: `findUnique({ where: { slug: 'kelme' } })`. Si no existe → error (`npm run db:ensure:kelme`).
- Categorías / equipos: upsert por id estable `ckll-*`. Si ya hay un `Team` en Kelme con el **mismo nombre**, reutilizar ese id (no duplicar “Colo Colo”).
- Temporada: `findFirst` por `organizationId` + nombre exacto `Copa Kelme Los Lagos`.
- Si la temporada existe y el número de categorías de copa no calza con `--variant` → error (no mezclar 4 y 6).
- Partidos: no crear un LEAGUE duplicado con el mismo `seasonCategoryId` + `homeTeamId` + `awayTeamId`. `--reset-matches` borra solo `SCHEDULED` de esta temporada.

**No hace:** usuarios, fotos, escudos, edición móvil, clima (el admin puede pulsar clima después).

---

## 8. Dominio testeable (sin DB)

Módulo `src/lib/copa-kelme-los-lagos.ts`:

- Constantes (nombres, ids, formato, comuna).
- `buildGroupFixture(variant)` → partidos de fase grupos/RR.
- `tableFromResults(teamKeys, results)` → orden de tabla.
- `buildFourTeamFinals(table)` / `buildSixTeamSemis` / `buildSixTeamCierre`.
- `parseCupSeedArgs(argv)` y `scheduleCupMatches(...)` (ISO Chile).

El script de seed solo habla con Prisma y llama a esas funciones.

---

## 9. Después del seed (ops, sin código)

1. `/kelme/admin/teams` — renombrar placeholders a clubes reales; subir escudos.
2. `/kelme/admin/players` — alta de niños; etiquetar la categoría de copa.
3. `/kelme/admin/seasons/[id]` inscripción — plantel por categoría (Grupo A/B o Infantil; también Finales cuando toque).
4. Ajustar fecha/hora/cancha en `/kelme/admin/matches` si el sábado 10:00 no sirve.
5. Asignar árbitro por partido.
6. Al terminar la fase: `--phase=finales`.
7. Costos del Excel se siguen en la planilla, no en LigaLab.

---

## 10. Fuera de alcance

- Hoja “Liga Kelme 6 FECHAS”.
- Módulo de gastos, inscripciones en dinero, o “costo por niño”.
- Penales, alargue, o `MatchType.CUP`.
- Wizard “Crear copa” en admin.
- Sembrar en org distinta de `kelme`.
- Publicar app Expo de esta copa.

---

## 11. Criterio de listo

- `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts` pasa.
- `--dry-run --variant=4|6 --phase=grupos --start=…` imprime 6 partidos de fase (4: 6 RR; 6: 6 de grupos).
- Seed real contra DB local con org `kelme`: temporada visible en `/kelme/admin`, dos tablas si variant=6, partidos programados en Chile.
- `--phase=finales` no crea finales si la fase previa no está `FINISHED`.
