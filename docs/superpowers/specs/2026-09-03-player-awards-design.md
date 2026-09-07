# Premios de jugador (badges) — Design Spec

> Plan: [`docs/superpowers/plans/2026-09-03-player-awards.md`](../plans/2026-09-03-player-awards.md)  
> Fecha: 2026-09-03  
> Producto: **LigaLab**  
> Estado: **Borrador para implementación** (asunciones cerradas en plan)

---

## 1. Objetivo

Permitir que cada organización defina **premios distintos** (ej. *Premio al 7 pulmones*, *Crack del mes*, *Fair play*) y los **otorgue manualmente** a jugadores. Los premios se muestran como **badges** en el panel del jugador.

No reemplaza MVP por partido (`MatchTeamMvp`) ni evaluaciones del DT.

---

## 2. Alcance fase 1

| Incluye | Excluye |
|---------|---------|
| Catálogo de premios por org | Cálculo automático desde stats |
| Otorgar / revocar premio a jugador | Asignación por DT (solo ORG_ADMIN) |
| Badge en dashboard jugador | Perfil público web / landing |
| Opcional: premio atado a temporada | App móvil (fase 2) |
| Emoji + color + nombre corto | Imagen custom por premio |

---

## 3. Modelo de datos

### `OrgAward` (catálogo)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | |
| `organizationId` | FK | |
| `name` | string | Ej. "Premio al 7 pulmones" |
| `shortLabel` | string | Chip compacto, ej. "7 pulmones" |
| `emoji` | string | 1–4 chars (emoji) |
| `description` | string? | Texto largo opcional |
| `accentColor` | string? | `#RRGGBB` |
| `sortOrder` | int | Orden en UI |
| `isActive` | bool | Ocultar sin borrar historial |

### `PlayerAward` (otorgamiento)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | |
| `organizationId` | FK | Denormalizado para RLS/queries |
| `playerId` | FK | |
| `orgAwardId` | FK | |
| `seasonId` | FK? | Null = premio “general” de la org |
| `note` | string? | Ej. "Copa Los Lagos 2026" |
| `awardedAt` | DateTime | Default now |
| `awardedByUserId` | string? | User que otorgó |

**Unique:** `(playerId, orgAwardId, seasonId)` — un jugador no recibe dos veces el mismo premio en el mismo scope (temporada o general).

---

## 4. UX

### Admin → Premios (`/{slug}/admin/awards`)

- Crear/editar/desactivar tipos de premio (patrón `FriendlyCategory`).
- Tabla con conteo de jugadores que lo tienen.
- Sección **Otorgar premio**: selector jugador + premio + temporada opcional + nota.

### Admin → Jugadores

- Columna o panel **Premios** con chips actuales + botón otorgar/revocar.

### Jugador → Panel (`/{slug}/player`)

- Sección **Mis premios** con chips (emoji + shortLabel + tooltip description).
- Agrupar por temporada si aplica.

---

## 5. API

| Método | Ruta | Rol |
|--------|------|-----|
| GET/POST | `/api/org-awards` | ORG_ADMIN |
| GET/PUT/DELETE | `/api/org-awards/[id]` | ORG_ADMIN |
| GET/POST | `/api/players/[id]/awards` | ORG_ADMIN |
| DELETE | `/api/players/[id]/awards/[awardId]` | ORG_ADMIN |
| GET | `/api/me/awards` | PLAYER (solo sus premios en la org activa) |

---

## 6. Decisiones cerradas

- UI y copy: **español chileno** (tú).
- Premios son **por organización**, no globales de plataforma.
- Otorgamiento **manual** en v1; stats/auto queda fuera.
- Revocar = DELETE en `PlayerAward` (sin soft-delete).
- Desactivar premio en catálogo no borra otorgamientos existentes.

---

## 7. Fase 2 (fuera de plan)

- Badges en app móvil (`MobilePlayerDetail.awards[]`).
- Landing pública (opcional vitrina).
- Plantillas de premios sugeridos al crear org.
