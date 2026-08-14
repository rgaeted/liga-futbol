# AdminTorneo — organizaciones, marca y admins — Design Spec

> Estado: **Diseño aprobado**
> Fecha: 2026-08-14
> Producto (nombre temporal): **AdminTorneo**
> Primer cliente: **Kelme** (hoy “Torneos Kelme”)
> Entrega: primera pieza de la plataforma multi-empresa

---

## 1. Objetivo

Convertir el sistema actual (una sola liga global llamada Torneos Kelme) en una plataforma donde **tú das de alta empresas organizadoras**. Cada empresa tiene su equipo de administradores, su marca (logo y colores) y su espacio en la web bajo una ruta (`/kelme`).

Kelme deja de ser el nombre del software y pasa a ser el primer tenant. El live y el panel de árbitro **no cambian de flujo**; sí cambian de piel según la empresa.

Esta spec **no** cubre jugador único global, pool de árbitros, desafíos entre empresas ni fábrica de apps por temporada. Esas piezas tienen specs propias después de esta.

## 2. Decisiones aprobadas

- Nombre de producto temporal: AdminTorneo. Se puede renombrar en UI sin cambiar el modelo.
- Quién crea empresas: solo el dueño de la plataforma (tú). No hay signup público ni billing en esta entrega.
- Aislamiento web: ruta `/{organizationSlug}/…` (ej. `admintorneo.cl/kelme`). No subdominio ni dominio propio en v1.
- Una persona (un email) puede pertenecer a varias empresas, con **rol distinto por empresa**.
- Marca v1: nombre comercial, logo, color primario, color secundario. Sin CSS libre, fuentes custom ni dominio propio.
- Panel plataforma separado: `/plataforma`. Los admins de una liga no lo ven.
- Un solo Postgres, un solo deploy. Cada fila de negocio lleva `organizationId`. No hay base por cliente.
- Datos actuales se migran a la organización `kelme`.
- URLs actuales redirigen al prefijo `/kelme`.

## 3. Alcance

### Incluido

- Modelo `Organization` + `OrganizationMembership` + flag/tabla de platform admin.
- Rutas con `[organizationSlug]`.
- Login global y selector de empresa si el usuario tiene más de una membresía.
- Panel `/plataforma`: crear empresa, invitar primer admin, pausar/reactivar.
- Skin de marca en admin, live y páginas públicas de esa empresa (`/{slug}/ayuda`, live). El login permanece global (`/login`).
- Invitación de DTs, árbitros y otros `ORG_ADMIN` **dentro de la empresa**.
- Scoping de queries y APIs por `organizationId`.
- Migración/backfill de datos existentes a Kelme.
- Redirects de URLs legacy.
- Tests de aislamiento, permisos y redirects.

### Excluido

- Identidad única de jugador entre ligas (hoy `Player` vs `FriendlyPlayer` se mantiene).
- Pool global o compartido de árbitros.
- Partidos amistosos o desafíos **entre empresas**.
- Generación/publicación de apps móviles por temporada (el piloto Kelme Invierno 2026 sigue apuntando a la API; el slug de edición no se redefine aquí).
- Cobros, planes, Stripe.
- Signup self-service.
- Subdominio o dominio custom.
- Impersonación de clientes.
- Cambio de slug después de crear la empresa.

## 4. Estado actual (deuda que esta entrega corrige)

- `User.role` es global (`ADMIN | COACH | REFEREE | PLAYER | FRIENDLY_COACH`).
- `Team`, `Season`, `Match`, `FriendlyCategory`, `FriendlyPlayer` no tienen dueño organizacional.
- Rutas `/admin`, `/live`, `/login` asumen un solo mundo.
- Landing y copy dicen “Torneos Kelme”.
- App móvil hardcodea slug `liga-invierno-kelme-puerto-varas-2026` y `apiBaseUrl` de prod; **no se toca** salvo que una URL pública cambie por el prefijo `/kelme` (ver §8).

## 5. Arquitectura

### 5.1 Unidades

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `Organization` | Tenant: slug, marca, estado | Prefijo de URL y FK de datos | — |
| `OrganizationMembership` | Relación user↔empresa + rol | Authz en panel y APIs | User, Organization |
| Platform guard | Solo platform admins entran a `/plataforma` | Middleware + `requirePlatformAdmin` | User (flag o tabla) |
| Org resolver | Traduce slug → org, 404/pausada | Layout `app/[organizationSlug]` | Organization |
| Org context | `organizationId` en sesión o header interno | Queries Prisma | Membership |
| Branding tokens | Inyecta colores/logo en layouts org | CSS variables / theme | Organization |

### 5.2 Flujo de autenticación

1. El usuario entra a `/login` (global).
2. Tras credenciales válidas:
   - 0 membresías en empresas activas → mensaje “no tienes acceso”; platform admin sin membresía igual entra a `/plataforma`.
   - 1 membresía activa → redirect a `/{slug}/admin` o al home de su rol (`/coach`, `/referee`, `/player`) **bajo el slug**.
   - N membresías → pantalla “Elige organización”.
3. La sesión JWT guarda `userId` y `activeOrganizationId` (se actualiza al cambiar de org).
4. Pedidos a `/api/...` de negocio incluyen el slug en la ruta (`/api/kelme/matches` **o** header/cookie derivado del path). Decisión de implementación: **las APIs de negocio viven bajo `/api/{organizationSlug}/...`** excepto `/api/auth` y `/api/plataforma/...`. Las APIs públicas actuales (`/api/matches/[id]/live`, crest, photo) se reescriben o aceptan org en el path; los GET públicos siguen sin sesión pero **deben** resolver el partido/recurso y comprobar que pertenece a la org del path.

### 5.3 Resolución de org en URL

- Layout de `/{organizationSlug}` carga la org por slug único.
- Slug desconocido → 404.
- Org `PAUSED` → página pública “Esta liga no está disponible” (503 o 404 consistente; **usar 503** en HTML y JSON `{ error: "Organización no disponible" }` para no filtrar si existe).
- Membership inexistente en rutas autenticadas de esa org → 403 JSON o redirect a selector.

## 6. Modelo de datos

### 6.1 Organization

- `id` cuid
- `slug` unique, inmutable tras crear (minúsculas, números, guiones; ej. `kelme`)
- `name` (nombre comercial)
- `logoStoragePath` o `logoMimeType` + `logoData` — **usar el mismo patrón que ya exista para crests/editorial**: si editorial ya usa Supabase Storage, el logo de org va a Storage; si no, BYTEA como crests de equipo. **Elección explícita: Supabase Storage bucket existente o `public` logos, path `orgs/{orgId}/logo`**, para no inflar Postgres. Fallback: si Storage no está listo en el entorno, BYTEA temporal no se permite; el alta de empresa exige URL/archivo vía Storage.
- `primaryColor` (hex)
- `secondaryColor` (hex)
- `status` enum `ACTIVE | PAUSED`
- `createdAt`, `updatedAt`

### 6.2 OrganizationMembership

- `id`
- `organizationId` + `userId` unique compuesto
- `role` enum de **membresía** (no el enum global actual):
  - `ORG_ADMIN` — panel admin de la empresa
  - `COACH` — DT de liga
  - `REFEREE` — árbitro
  - `PLAYER` — jugador con cuenta
  - `FRIENDLY_COACH` — DT amistoso (se conserva el rol actual, scoped)
- `createdAt`, `updatedAt`

Un usuario puede tener **un rol por empresa** en v1 (una fila membership). Si más adelante hace falta admin+árbitro en la misma empresa, se abre a roles múltiples; **no en esta entrega**.

### 6.3 Platform admin

- Campo `User.isPlatformAdmin Boolean @default(false)` **o** tabla `PlatformAdmin`. **Elección: `User.isPlatformAdmin`**, un solo usuario inicial (tú) vía seed/migración, no UI de “crear platform admin” en v1.

### 6.4 FKs de negocio

`organizationId` obligatorio (no null tras backfill) en:

- `Season`, `Team`, `Match`, `FriendlyCategory`, `FriendlyPlayer`
- Contenido editorial: `Article`, `Gallery`, `Sponsor`
- `SeasonMobileConfig` queda colgando de `Season` (ya scoped por season → org)

`Player` sigue atado a `User` + `Team`; el team ya tiene org, no hace falta FK extra en v1.

`User` no tiene `organizationId`; solo membresías.

### 6.5 Qué pasa con `User.role`

Se deja de usar como fuente de verdad. Migración:

1. Crear membresías Kelme según `User.role` actual.
2. `User.role` permanece en schema **deprecado** hasta la siguiente spec (jugador único), o se elimina en la misma migración si todos los `requireRole` ya leen membership. **Elección: eliminar usos de `User.role` en authz en esta entrega y quitar el campo en la migración**, para no tener dos fuentes. El enum Prisma `Role` se reemplaza por `MembershipRole`.

## 7. Permisos

### Platform admin (`/plataforma`)

Puede:

- listar empresas;
- crear empresa (slug, nombre, logo, colores);
- invitar primer `ORG_ADMIN` (email; si el user no existe, se crea con password temporal o link de set-password — **usar el mismo flujo de alta de usuario que ya existe en admin users**, scoped a plataforma);
- pausar / reactivar.

No puede (salvo membership propia):

- crear partidos, equipos, temporadas;
- entrar a `/{slug}/admin`.

### ORG_ADMIN

Puede, **solo en su org**:

- invitar/editar DTs, árbitros, jugadores con cuenta, otros `ORG_ADMIN`;
- todo el panel actual (partidos, amistosos, live, CMS, temporadas);
- editar nombre comercial, logo y colores;
- **no** cambiar slug;
- **no** pausar la empresa (eso es plataforma).

### COACH / REFEREE / PLAYER / FRIENDLY_COACH

Comportamiento actual, filtrado a recursos de `activeOrganizationId`. Un árbitro de Kelme no ve partidos de otra org.

## 8. Rutas y redirects

| Antes | Después |
|-------|---------|
| `/admin` | `/kelme/admin` |
| `/admin/*` | `/kelme/admin/*` |
| `/live/[id]` | `/kelme/live/[id]` |
| `/coach/*` | `/kelme/coach/*` |
| `/referee/*` | `/kelme/referee/*` |
| `/player/*` | `/kelme/player/*` |
| `/ayuda` | `/kelme/ayuda` (contenido puede seguir genérico + logo org) |
| `/login` | `/login` (global) |
| `/` landing marketing | Landing **AdminTorneo** (producto), no la liga Kelme. Link “Entrar” → login. Kelme no es la home del software. |
| `/privacidad/app` | se mantiene global (política del producto) o se duplica por org más adelante; **v1 global**. |

Redirect 308 permanente de paths legacy **solo si no hay slug**: asume tenant `kelme` para no romper bookmarks y el live que ya circula.

APIs públicas usadas por la app móvil (`/api/mobile/v1/leagues/[slug]/…`) **no llevan org en el path de edición**: el `SeasonMobileConfig.slug` sigue siendo el identificador de la app. Internamente la season ya tiene `organizationId`. No se cambia el contrato móvil en esta entrega.

GET públicos de live/crest/photo: o bien se montan en `/api/{orgSlug}/matches/...` **y** se deja un alias legacy que resuelve el match y redirige, o se mantiene el path actual porque el `matchId` es global único (cuid). **Elección: mantener GET públicos por `matchId` sin org en la URL** (el id ya es único); mutaciones y listados sí van scoped. Evita romper el live embebido y sockets/realtime actuales.

## 9. Marca (theming)

- Layout de `/{slug}` define CSS variables `--org-primary`, `--org-secondary` y logo en header.
- Componentes que hoy usan `kelme-red` / hardcode `#CD212A` leen tokens de org en rutas de tenant. El panel `/plataforma` usa la marca AdminTorneo (neutra, no Kelme).
- Live scoreboard: mismos componentes, tokens de color y logo de la org del partido (`match.organizationId`).
- Emails transaccionales de esta entrega: si existen, usar nombre de la org; si no hay emails, no se inventan.

## 10. UX de plataforma y selector

### `/plataforma`

- Lista de empresas (nombre, slug, estado, cantidad de admins).
- Alta: slug, nombre, logo, colores, email del primer admin.
- Acciones: pausar / reactivar.
- No hay “entrar como”.

### Selector de org

- Tras login con N membresías, lista nombre + logo.
- En header del panel, si N > 1, control “Cambiar organización” que setea `activeOrganizationId` y navega a `/{slug}/…` del mismo tipo de panel.

## 11. Migración de datos

1. Insertar `Organization` `slug=kelme`, `name=Torneos Kelme`, colores actuales `#CD212A` / `#FFFFFF`, logo actual si hay asset, `ACTIVE`.
2. `UPDATE` de Season, Team, Match, FriendlyCategory, FriendlyPlayer, Article, Gallery, Sponsor con ese `organizationId`.
3. Para cada `User`, crear `OrganizationMembership` Kelme con el rol mapeado 1:1 desde `User.role`.
4. Marcar `isPlatformAdmin=true` **solo** en la cuenta que tú definas (no todos los ADMIN actuales). Los `ADMIN` actuales de Kelme quedan `ORG_ADMIN`, no platform.
5. Quitar `User.role` tras adaptar `requireRole` → `requireMembershipRole(orgId, roles)`.

Idempotente: si `kelme` ya existe, no duplicar.

## 12. Errores y casos borde

- Slug reservado: no permitir `plataforma`, `login`, `api`, `privacidad`, `admin`, `live` como slug de org.
- Conflicto de slug en alta → 400.
- Invitar email que ya es `ORG_ADMIN` de esa org → 409 o no-op.
- Invitar email que ya existe en otra org → se crea **otra** membership; no se pisa el rol ajeno.
- Partido live de org pausada: GET público 503.
- Session con `activeOrganizationId` de org pausada o membership borrada: forzar selector o logout suave a `/login`.

## 13. Pruebas

- Platform admin crea org + invita admin; el invitado entra a `/{slug}/admin` y no a `/plataforma`.
- ORG_ADMIN Kelme no lista/edita recursos si el slug de la URL es otra org (403).
- Usuario con dos memberships ve selector; al elegir cambia datos visibles.
- Redirect `/admin` → `/kelme/admin` para usuario Kelme.
- Live de partido Kelme usa colores de la org.
- Org pausada: login de sus miembros no entra al panel; live 503.
- `User.role` ya no autoriza; membership sí.
- Slug reservado rechazado.
- APIs móviles de edición publicada siguen 200 con el slug de temporada (no el de org).

## 14. Relación con el resto de la plataforma (siguiente)

Orden sugerido (specs + planes, 2026-08-14):

1. **Jugador único** — spec [`2026-08-14-jugador-unico-design.md`](2026-08-14-jugador-unico-design.md) · plan [`../plans/2026-08-14-jugador-unico.md`](../plans/2026-08-14-jugador-unico.md)
2. **Pool de árbitros** — spec [`2026-08-14-pool-arbitros-design.md`](2026-08-14-pool-arbitros-design.md) · plan [`../plans/2026-08-14-pool-arbitros.md`](../plans/2026-08-14-pool-arbitros.md)
3. **Amistosos / desafíos entre orgs** — spec [`2026-08-14-amistosos-entre-orgs-design.md`](2026-08-14-amistosos-entre-orgs-design.md) · plan [`../plans/2026-08-14-amistosos-entre-orgs.md`](../plans/2026-08-14-amistosos-entre-orgs.md)
4. **App móvil por temporada** — spec [`2026-08-14-app-movil-por-temporada-design.md`](2026-08-14-app-movil-por-temporada-design.md) · plan [`../plans/2026-08-14-app-movil-por-temporada.md`](../plans/2026-08-14-app-movil-por-temporada.md)

## 15. Fuera de discusión en implementación

No se cambia el motor de reloj, cronología, formaciones, MVP ni realtime. Solo scoping y theming.
