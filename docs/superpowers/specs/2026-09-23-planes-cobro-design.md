# Planes de cobro LigaLab — Design Spec

> Fecha: 2026-09-23  
> Producto: **LigaLab**  
> Estado: **Propuesta para revisión** (no implementada)  
> Depende de: `Organization` + `OrganizationMembership`, landing `/{slug}`, amistosos, temporadas/ligas

---

## 1. Objetivo

Cualquiera puede **usar** LigaLab gratis (ver partidos, anotarse, jugar). Quien **organiza** paga uno de dos planes:

- **Club:** equipos + amistosos + una landing pública tipo Partidos Los Lunes.
- **Liga:** temporadas, partidos oficiales, contenido de liga y **hasta 50 equipos**, cada uno con su propia página pública similar a Los Lunes.

El cobro vive en la **organización** (tenant), no en el usuario. Un jugador puede estar en orgs gratis y de pago sin pagar él.

---

## 2. Por qué se parte en varios planes de implementación

Son subsistemas independientes. Cada uno debe producir software usable solo:

| Entrega | Qué deja funcionando |
|---------|----------------------|
| **1 — Entitlements** (este ciclo) | Plan en la org, gates en API/nav, asignación desde `/plataforma`. Prod actual no pierde features (backfill a Liga). |
| **2 — Landing Club** | Cualquier org Club/Liga puede tener vitrina pública tipo Los Lunes (hoy hardcodeada a `loslunes`). |
| **3 — Páginas de equipo** | `/{org}/equipos/{team}` estilo Los Lunes; solo plan Liga. |
| **4 — Checkout** | Pago self-service (Stripe u otro). Fuera de v1: hoy no hay billing en el repo. |

Esta spec cubre el producto completo. El plan de código de la entrega 1 está en `docs/superpowers/plans/2026-09-23-planes-cobro-entitlements.md`.

---

## 3. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Unidad de cobro | `Organization.plan` | El tenant ya aísla equipos, partidos y landing. |
| Planes | `FREE` · `CLUB` · `LEAGUE` | Tres niveles claros. |
| Gratis | Consumir: ver, jugar, RSVP, panel jugador/árbitro/DT invitado | “Cualquier usuario accede gratis”. |
| Club | Crear equipos, categorías amistosas, amistosos, desafíos; una landing de org | “Como Los Lunes, solo amistosos”. |
| Liga | Todo lo de Club + temporadas, partidos de liga, CMS, mobile edition + máx. 50 equipos + página por equipo | “Ligas y temporadas y todo lo demás”. |
| Tope de equipos | Solo Liga: **50**. Club: sin tope extra en v1. | El usuario fijó 50 en Liga; Club no lo mencionó. |
| Baja de plan | Datos existentes se quedan; se bloquea **crear** lo que el plan no permite | No borrar temporadas ni equipos al bajar. |
| Orgs actuales (`kelme`, `loslunes`, etc.) | Migración las deja en `LEAGUE` | Evitar romper prod. Plataforma puede bajar `loslunes` a Club después. |
| Quién cambia el plan (v1) | Solo platform admin en `/plataforma` | No hay Stripe/pasarela en el código. |
| Signup de org | Sigue siendo solo plataforma | Self-service org + checkout = entrega 4. |
| Páginas de equipo | Entrega 3, no esta | Requiere generalizar el skin Los Lunes. |

### Alternativas descartadas

1. **Plan en el User.** Un admin pagaría y sus jugadores no podrían ver la liga.
2. **Borrar datos al bajar de plan.** Destructivo e innecesario.
3. **Stripe en la misma entrega que los gates.** No hay infraestructura; atrasaría el corte de features.
4. **Tope de 50 equipos también en Club.** No pedido; YAGNI.

---

## 4. Matriz de capacidades

`Capability` es el nombre canónico en código (`src/lib/billing/capabilities.ts`).

| Capability | FREE | CLUB | LEAGUE |
|------------|------|------|--------|
| `VIEW_PUBLIC` | sí | sí | sí |
| `PLAY` (jugador / asistencia / live) | sí | sí | sí |
| `MANAGE_USERS` | no* | sí | sí |
| `MANAGE_TEAMS` (crear/editar equipo) | no | sí | sí (si `teamCount < 50` al crear) |
| `MANAGE_FRIENDLIES` | no | sí | sí |
| `MANAGE_SEASONS` | no | no | sí |
| `MANAGE_LEAGUE_MATCHES` | no | no | sí |
| `MANAGE_LEAGUE_CONTENT` (artículos, galerías, sponsors, awards/badges de liga, mobile edition) | no | no | sí |
| `PUBLISH_ORG_LANDING` (skin tipo Los Lunes en `/{slug}`) | no (landing mínima o default actual sin “premium”) | sí | sí |
| `PUBLISH_TEAM_PAGES` | no | no | sí |

\* FREE no tiene admin útil: una org FREE no se crea por signup en v1. Si una org baja a FREE, el admin ve muro de upgrade; no crea nada.

Mensajes de error (es-CL, tú):

- Sin capacidad: `Tu plan no incluye esto. Pasa a Club o Liga para desbloquearlo.`
- Tope de equipos: `El plan Liga permite hasta 50 equipos.`

---

## 5. Modelo

```prisma
enum BillingPlan {
  FREE
  CLUB
  LEAGUE
}

model Organization {
  // ...campos actuales
  plan BillingPlan @default(FREE)
}
```

Constante: `LEAGUE_TEAM_LIMIT = 50` en `src/lib/billing/plans.ts`.

No hay tabla de suscripción, fechas ni proveedor en v1. El plan es un enum. Historial de pagos = entrega 4.

`createOrganization` acepta `plan` opcional (default `FREE`). Plataforma lo setea al crear o con PATCH.

---

## 6. API de dominio

```ts
export type BillingPlan = 'FREE' | 'CLUB' | 'LEAGUE'
export type Capability =
  | 'VIEW_PUBLIC'
  | 'PLAY'
  | 'MANAGE_USERS'
  | 'MANAGE_TEAMS'
  | 'MANAGE_FRIENDLIES'
  | 'MANAGE_SEASONS'
  | 'MANAGE_LEAGUE_MATCHES'
  | 'MANAGE_LEAGUE_CONTENT'
  | 'PUBLISH_ORG_LANDING'
  | 'PUBLISH_TEAM_PAGES'

export function planHasCapability(plan: BillingPlan, capability: Capability): boolean

export function assertCanCreateTeam(input: {
  plan: BillingPlan
  currentTeamCount: number
}): { ok: true } | { ok: false; error: string }

export function assertOrgCapability(
  plan: BillingPlan,
  capability: Capability,
): { ok: true } | { ok: false; error: string }
```

Las rutas mutadoras llaman esto **después** de `requireOrgRole` y **antes** de escribir. HTTP 403 + `{ error }`.

Rutas a gatear en entrega 1:

| Ruta | Capability |
|------|------------|
| `POST /api/teams` | `MANAGE_TEAMS` + tope 50 si Liga |
| `POST /api/seasons` | `MANAGE_SEASONS` |
| `POST /api/matches` `matchType=LEAGUE` | `MANAGE_LEAGUE_MATCHES` |
| `POST /api/matches` `matchType=FRIENDLY` (intra y challenge) | `MANAGE_FRIENDLIES` |
| `POST /api/friendly-categories` | `MANAGE_FRIENDLIES` |
| APIs de articles/galleries/sponsors / mobile edition / awards/badges de org | `MANAGE_LEAGUE_CONTENT` |

GET y paneles de jugador/árbitro **no** se gatean.

---

## 7. UI admin (entrega 1)

- `buildTenantNavGroups` recibe `plan` y oculta ítems que el plan no permite (Temporadas, Contenido, Premios/Insignias de liga, “Programar partido” de liga).
- Club sigue viendo Equipos, Jugadores, Partidos (amistosos), Árbitros, Cuentas.
- Rutas admin bloqueadas: página con copy de upgrade, no crash.
- `/plataforma`: ver y cambiar `plan` de cada org.

---

## 8. Entrega 2 — Landing Club (fuera de este plan de código)

Hoy el skin “Los Lunes” está hardcodeado a `LOSLUNES_SLUG`. Club/Liga deben poder activar el mismo tipo de vitrina (hero, live, resultados) con marca de la org, solo con amistosos en Club.

No se implementa en la entrega 1.

---

## 9. Entrega 3 — Páginas de equipo (fuera de este plan de código)

- Ruta pública: `/{organizationSlug}/equipos/{teamSlug}`.
- Look & feel cercano a `/loslunes`: hero, próximo/live del equipo, últimos resultados, goleadores del equipo.
- Solo si `PUBLISH_TEAM_PAGES` (plan Liga).
- Cada `Team` necesita slug único por org (migración posterior).
- Tope: no se puede crear el equipo 51.

No se implementa en la entrega 1.

---

## 10. Entrega 4 — Cobro self-service (fuera de este plan de código)

Pasarela, webhooks, periodo de prueba, prorrateo. v1 es asignación manual.

---

## 11. Fuera de alcance global

- Dominio o subdominio propio por plan.
- Tope de amistosos o de jugadores.
- Impersonación.
- Borrar orgs al no pagar (usar `OrganizationStatus.PAUSED` que ya existe si hace falta después).
- Cambiar el modelo de membresías.

---

## 12. Criterio de éxito (entrega 1)

- Org `LEAGUE` (prod actual backfilleada) crea equipos, temporadas y ambos tipos de partido como hoy.
- Org `CLUB` crea equipo y amistoso; `POST` temporada y partido de liga → 403.
- Org `LEAGUE` con 50 equipos: el 51 → 403 con el mensaje de tope.
- Org `FREE`: no crea equipos ni partidos.
- Un jugador de cualquier plan sigue viendo live y su panel.
- Platform admin cambia el plan sin tocar Stripe.
