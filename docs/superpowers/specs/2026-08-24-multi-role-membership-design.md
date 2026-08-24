# Multi-rol por empresa — Design Spec

> Fecha: 2026-08-24  
> Producto: **LigaLab**  
> Depende de: organizaciones, `OrganizationMembership`, roster unificado, DT amistoso  
> Estado: **Diseño aprobado** (nav unificado B; DT amistoso solo al designar en roster)

---

## 1. Objetivo

Hoy cada usuario tiene **un solo rol** por empresa (`OrganizationMembership.role`). Al asignar DT amistoso se **reemplaza** el rol anterior (p. ej. `PLAYER` → `FRIENDLY_COACH`), y el usuario pierde acceso a otras áreas.

Roger debería poder ser **admin + jugador + DT amistoso** a la vez dentro de Kelme, con un **menú unificado** que muestre todas las secciones permitidas.

Además, el rol **DT amistoso no se asigna manualmente** en Admin → Usuarios: se **activa automáticamente** cuando el admin lo designa DT en el roster de un amistoso (y la ficha tiene cuenta enlazada).

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Modelo | `OrganizationMembership.roles: MembershipRole[]` | Un registro por `(userId, organizationId)`; N roles por usuario |
| Navegación | **Menú unificado (opción B)** | Un sidebar con todos los grupos a los que el usuario accede; sin selector de “modo” |
| DT amistoso | **Automático al designar** en roster | Evita admin duplicado; alinea rol con `isCoach` en partido |
| DT amistoso en Admin Usuarios | **No asignable manualmente** | Quita `FRIENDLY_COACH` del formulario y del PUT de roles |
| Al promover DT | **Agregar** `FRIENDLY_COACH`; **nunca quitar** `PLAYER` | Roger sigue siendo jugador |
| Revocar DT amistoso | **No automático en v1** | Conserva acceso a formaciones de partidos ya jugados |
| Roles asignables manualmente | `ORG_ADMIN`, `COACH`, `REFEREE`, `PLAYER` | Los cuatro clásicos de acceso operativo |
| Permisos API | `hasAnyRole(roles, allowed)` | Sustituye `allowed.includes(membership.role)` |
| Sesión JWT | `membershipRoles: MembershipRole[]` | Deprecar `membershipRole` singular en callbacks |
| Post-login | Prioridad: Admin → Coach liga → Árbitro → Jugador | Landing en la ruta de mayor rol; nav igual de completo |

### Alternativas descartadas

1. **Tabla puente `OrganizationMembershipRole`.** Más joins; mismo resultado con más complejidad operativa.
2. **Rol único + flags.** No resuelve Admin + Jugador + DT de forma limpia.
3. **Selector de modo activo (A) o tarjetas post-login (C).** El usuario prefirió menú unificado (B).
4. **DT amistoso asignable manualmente.** Descartado: genera desync con roster y el bug de Roger.

---

## 3. Alcance

### Incluido

- Migración Prisma: `role` → `roles MembershipRole[]` con backfill `ARRAY[role]`.
- Helpers: `hasAnyRole`, `canAccessAreas`, `resolvePrimaryDashboardPath`, `mergeMembershipRole`.
- Auth: `requireOrgRole`, `requireOrgRoleForSlug`, `requireMatchOrgRole`, callbacks Auth.js.
- `syncFriendlyMatchRoster`: en lugar de `update role PLAYER → FRIENDLY_COACH`, hacer `mergeMembershipRole(userId, orgId, FRIENDLY_COACH)`.
- Nav unificado en `src/lib/tenant-nav.ts`; layout padre `(dashboard)/layout.tsx` o shells compartidos.
- Admin → Usuarios: checkboxes multi-rol (sin DT amistoso); tabla con badges múltiples.
- Tests: migración, permisos, promoción roster, nav builder, regresión Roger cross-org.

### Excluido

- Revocación automática de `FRIENDLY_COACH` al quitar DT del roster.
- Multi-rol en **plataforma** (`isPlatformAdmin` sigue aparte).
- Cambios en app móvil Expo.
- Rol DT amistoso sin cuenta (sigue sin panel; solo ficha en roster).

---

## 4. Modelo de datos

```prisma
model OrganizationMembership {
  id             String           @id @default(cuid())
  organizationId String
  userId         String
  roles          MembershipRole[] // antes: role MembershipRole
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@unique([organizationId, userId])
  @@index([userId])
}
```

**Migración SQL (conceptual):**

```sql
ALTER TABLE "OrganizationMembership" ADD COLUMN "roles" "MembershipRole"[];
UPDATE "OrganizationMembership" SET "roles" = ARRAY["role"];
ALTER TABLE "OrganizationMembership" ALTER COLUMN "roles" SET NOT NULL;
ALTER TABLE "OrganizationMembership" DROP COLUMN "role";
```

**Invariantes:**

- `roles.length >= 1`.
- `FRIENDLY_COACH` solo entra vía roster sync (o backfill one-off de usuarios afectados).
- `ORG_ADMIN` puede coexistir con cualquier otro rol.

---

## 5. Permisos y auth

### Unión de áreas por rol

| Rol | Áreas |
|-----|-------|
| `ORG_ADMIN` | admin, player, coach, referee, live |
| `COACH` | coach, live |
| `REFEREE` | referee, live |
| `PLAYER` | player, live |
| `FRIENDLY_COACH` | player (solo rutas DT amistoso + live) |

`canAccessAreas(roles, area)` = `roles.some(r => ROLE_ACCESS[r].includes(area))`.

### Layouts

Cada layout (`admin`, `player`, `coach`, `referee`) deja de redirigir por rol único. Chequea:

```typescript
if (!membership || !canAccessAreas(membership.roles, 'admin')) redirect(...)
```

Si no tiene acceso al área actual pero sí a otra → redirect a `resolvePrimaryDashboardPath(slug, roles)`.

### APIs

Todas las rutas que hoy usan `requireOrgRole([...])` pasan a validar contra `membership.roles`.

---

## 6. DT amistoso automático

### Al guardar roster (`syncFriendlyMatchRoster`)

Para cada entry con `isCoach: true`:

1. Cargar `player.person.userId`.
2. Si hay cuenta: `mergeMembershipRole(coachUserId, player.organizationId, FRIENDLY_COACH)`.
3. **No** modificar otros roles (`PLAYER` se mantiene).

`mergeMembershipRole`:

```typescript
// Si FRIENDLY_COACH ∉ roles → append y persistir
// Idempotente; nunca elimina roles existentes
```

### Visibilidad en nav

Grupo **“DT amistoso”** visible si:

- `roles.includes(FRIENDLY_COACH)`, **o**
- tiene participaciones `FriendlyMatchPlayer.isCoach` (fallback para cuentas aún sin merge post-migración).

### Admin → Usuarios

- Crear/editar: checkboxes `ORG_ADMIN`, `COACH`, `REFEREE`, `PLAYER`.
- Badge **“DT amistoso”** en tabla si `roles` incluye `FRIENDLY_COACH` o `isFriendlyCoach` derivado de participaciones (solo lectura).
- PUT `/api/users/[id]`: body `roles: MembershipRole[]`; rechazar si incluye `FRIENDLY_COACH`.

---

## 7. Navegación unificada

Nuevo `buildTenantNavGroups(slug, context)`:

```typescript
type TenantNavContext = {
  roles: MembershipRole[]
  hasPlayerProfile: boolean      // ficha Player en org o cross-org vinculada
  hasFriendlyCoachParticipations: boolean
}
```

**Grupos (orden):**

1. **Administración** — si `ORG_ADMIN` → items de `buildAdminNavGroups` actuales.
2. **DT liga** — si `COACH` → `/coach`, etc.
3. **Árbitro** — si `REFEREE`.
4. **Jugador** — si `PLAYER` o `hasPlayerProfile` → Mi panel, Mis partidos.
5. **DT amistoso** — si `FRIENDLY_COACH` o `hasFriendlyCoachParticipations` → Amistosos como DT.

Todos los shells (`AdminShell`, `DashboardShell`) reciben el mismo `navGroups` desde el layout padre `(dashboard)/layout.tsx`.

Header: badges de roles (reutilizar `resolveUserRoleTags` ampliado para leer `roles[]`).

---

## 8. Sesión y cookies

- Login: cargar `membership.roles` de la org activa (cookie o única membership).
- `SyncTenantSession`: enviar `roles[]` al client si hace falta para UI.
- JWT: `membershipRoles: string[]`; mantener `membershipRole` como `roles[0]` o rol primario **solo durante transición** (1 release), luego remover.

---

## 9. Migración de datos y casos Roger

1. Backfill `roles = ARRAY[role]` para todas las memberships.
2. Usuarios que eran `FRIENDLY_COACH` sin `PLAYER`: si tienen ficha de jugador, **agregar** `PLAYER` al array (recuperar acceso jugador).
3. Roger (`kelme` membership + ficha `loslunes`): no requiere cambio de schema extra; `coachPlayerIdsForUser` cross-org sigue vigente.
4. Script opcional `scripts/backfill-friendly-coach-roles.ts`: para cada `FriendlyMatchPlayer.isCoach` con `person.userId`, merge `FRIENDLY_COACH` en la org de la ficha **y** en orgs anfitrionas de desafíos donde participó (si tiene membership).

---

## 10. Testing

| Caso | Esperado |
|------|----------|
| Admin asigna Roger `ORG_ADMIN` + `PLAYER` | Ambos roles persisten |
| Admin designa Roger DT en amistoso | Se agrega `FRIENDLY_COACH`; `PLAYER` intacto |
| Roger entra a Kelme | Nav muestra Admin + Jugador + DT amistoso |
| PUT usuario con `FRIENDLY_COACH` en body | 400 |
| Usuario solo `REFEREE` abre `/admin` | Redirect a `/referee` |
| Cross-org desafío Kelme ↔ Los Lunes | DT visitante ve partido en nav Kelme si tiene membership allí |

---

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Muchos call sites con `.role` | Grep + codemod; tipos estrictos post-migración |
| Nav muy largo para admin+jugador+DT | Grupos colapsables en sidebar (opcional v1.1) |
| DT sin cuenta designado en roster | Sin rol hasta que reclame ficha o admin cree cuenta |
| JWT stale tras cambio de roles | `force-dynamic` layouts; re-login no obligatorio si session refresh lee DB |

---

## 12. Orden de implementación sugerido

1. Schema + migración + helpers de roles.
2. Auth/APIs (`requireOrgRole`, session).
3. Roster sync (`mergeMembershipRole`; quitar overwrite).
4. Nav unificado + layouts.
5. Admin usuarios (checkboxes; quitar DT manual).
6. Backfill + tests E2E Roger.

---

## 13. Referencias

- `src/lib/membership-role.ts` — acceso por área (hoy single-role).
- `src/lib/user-roles-display.ts` — badges múltiples (parcial).
- `src/lib/friendly-match-roster.ts` — promoción PLAYER → FRIENDLY_COACH (a reemplazar).
- `src/lib/friendly-match-coach.ts` — listado DT cross-org (mantener).
- Spec DT amistoso histórica: migraciones `20260727170000`, `20260727200000`.
