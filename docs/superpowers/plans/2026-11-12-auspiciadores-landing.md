# Auspiciadores en el landing — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier liga muestre a sus auspiciadores en su landing (franja, tarjetas, canchas y definiciones presentadas) y vea vistas y clics por mes en el panel.

**Architecture:** Se extiende el modelo `Sponsor` existente (por temporada) y se agregan `SponsorAssignment` (cancha/fase → auspiciador) y `SponsorMonthlyStat` (vistas/clics por mes). Un módulo puro `src/lib/sponsors/landing.ts` arma lo que el landing muestra; `src/lib/sponsors/landing-query.ts` lo carga de la base. Dos rutas públicas registran clics (redirección) y vistas (beacon). El panel existente de Patrocinadores gana campos, asignaciones y estadísticas.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + PostgreSQL, Zod, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-auspiciadores-landing-design.md`

## Global Constraints

- Leer la guía relevante en `node_modules/next/dist/docs/` antes de escribir rutas o páginas (Next 16 con cambios incompatibles).
- UI en español de Chile con tú (no voseo); fechas con `APP_LOCALE` de `src/lib/locale.ts`.
- Migración solo aditiva, escrita a mano en `prisma/migrations/20261112000000_sponsors_landing/migration.sql` y verificada con `prisma migrate diff --from-schema <schema anterior> --to-schema prisma/schema.prisma --script` (usar un `DIRECT_URL` ficticio).
- `tagline` máx. 140, `ctaLabel` máx. 40; `showOnLanding` por defecto `false`; `tier` por defecto `OFFICIAL`.
- Targets válidos: `court:<n>` (n entero 1–99), `phase:FINAL`, `phase:THIRD_PLACE`, `phase:FIFTH_PLACE`.
- Mes de estadística = día 1 del mes en America/Santiago, guardado como `Date` UTC de ese inicio (`2026-11-01T03:00:00.000Z` para noviembre 2026).
- Sin datos personales: no se guarda IP, cookie ni user agent.
- Enlaces a auspiciadores: `target="_blank" rel="sponsored noopener"`, siempre vía la ruta de clic.
- Si no hay auspiciadores visibles con `showOnLanding`, no se renderiza ninguna sección ni marca.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No desplegar a producción sin autorización.

## Review Focus

1. Auspiciador vencido o inactivo, pero aún con asignación de cancha/final → no debe aparecer en la cancha/final ni aceptar clics (redirige al landing).
2. `ctaUrl`/`websiteUrl` con esquema `javascript:` o sin URL → la validación rechaza esquemas que no sean http(s); la ruta de clic nunca redirige a algo no guardado.
3. Refresco automático del landing (`OrgPublicLandingRefresh`) y bots → las vistas no se suman en cada refresco; bots no suman clics.
4. Ids de auspiciadores de otra organización enviados al beacon de vistas → se ignoran.
5. Liga sin partidos con cancha o sin fases de definición → el panel no muestra filas vacías y el landing no muestra "Cancha · undefined".

---

### Task 1: Esquema, migración y validaciones

**Files:**
- Modify: `prisma/schema.prisma` (model `Sponsor`, `Season`, nuevos `SponsorTier`, `SponsorAssignment`, `SponsorMonthlyStat`)
- Create: `prisma/migrations/20261112000000_sponsors_landing/migration.sql`
- Modify: `src/lib/validations/editorial.ts`
- Test: `tests/lib/validations-editorial.test.ts`

**Interfaces:**
- Produces: enum `SponsorTier { MAIN OFFICIAL }`; `Sponsor.tier`, `tagline String?`, `ctaLabel String?`, `ctaUrl String?`, `showOnLanding Boolean @default(false)`, relaciones `assignments`, `monthlyStats`.
- Produces: `SponsorAssignment { id String @id @default(cuid()), seasonId, sponsorId, target String, createdAt; @@unique([seasonId, target]); onDelete: Cascade en ambas relaciones }`.
- Produces: `SponsorMonthlyStat { sponsorId, month DateTime, views Int @default(0), clicks Int @default(0); @@id([sponsorId, month]); onDelete: Cascade }`.
- Produces (Zod): `sponsorBaseSchema` gana `tier`, `tagline`, `ctaLabel`, `ctaUrl` (http/https solamente, `''` → null), `showOnLanding`; `websiteUrl` también restringido a http/https. Nuevo `sponsorAssignmentSchema = { target: string que cumpla /^(court:([1-9]\d?)|phase:(FINAL|THIRD_PLACE|FIFTH_PLACE))$/, sponsorId: string | null }`, tipo `SponsorAssignmentInput`.

- [ ] **Step 1: Tests de validación que fallan**

```ts
it('acepta los campos de landing del auspiciador', () => {
  const r = createSponsorSchema.safeParse({ name: 'Ferretería X', tier: 'MAIN', tagline: '10 % para jugadores', ctaLabel: 'Escríbenos', ctaUrl: 'https://wa.me/56911112222', showOnLanding: true })
  expect(r.success).toBe(true)
})
it('rechaza enlaces que no sean http(s)', () => {
  expect(createSponsorSchema.safeParse({ name: 'X', ctaUrl: 'javascript:alert(1)' }).success).toBe(false)
  expect(createSponsorSchema.safeParse({ name: 'X', websiteUrl: 'ftp://x.cl' }).success).toBe(false)
})
it('limita frase y texto del botón', () => {
  expect(createSponsorSchema.safeParse({ name: 'X', tagline: 'a'.repeat(141) }).success).toBe(false)
  expect(createSponsorSchema.safeParse({ name: 'X', ctaLabel: 'a'.repeat(41) }).success).toBe(false)
})
it('valida targets de asignación', () => {
  for (const target of ['court:1', 'court:12', 'phase:FINAL', 'phase:THIRD_PLACE', 'phase:FIFTH_PLACE'])
    expect(sponsorAssignmentSchema.safeParse({ target, sponsorId: 's1' }).success).toBe(true)
  for (const target of ['court:0', 'court:100', 'phase:GROUP', 'cancha:1'])
    expect(sponsorAssignmentSchema.safeParse({ target, sponsorId: 's1' }).success).toBe(false)
  expect(sponsorAssignmentSchema.safeParse({ target: 'court:2', sponsorId: null }).success).toBe(true)
})
```

- [ ] **Step 2:** `npx vitest run tests/lib/validations-editorial.test.ts` → FAIL (campos/esquema inexistentes).
- [ ] **Step 3:** Implementar esquema Zod y modelo Prisma; escribir la migración SQL a mano (CREATE TYPE, ALTER TABLE "Sponsor" ADD COLUMN ×5, CREATE TABLE ×2 con FKs cascade, índice único `("seasonId","target")`, índice `SponsorAssignment("sponsorId")`); `npx prisma generate`.
- [ ] **Step 4:** `prisma migrate diff` contra el schema anterior (`git show HEAD:prisma/schema.prisma > $TEMP/old.prisma`) debe producir el mismo SQL que la migración; `npx vitest run tests/lib/validations-editorial.test.ts` → PASS; `npx tsc --noEmit` limpio.
- [ ] **Step 5:** Commit `feat: modelo de auspiciadores para el landing`.

### Task 2: Lógica pura del landing y estadísticas

**Files:**
- Create: `src/lib/sponsors/landing.ts`
- Create: `src/lib/sponsors/stats.ts`
- Test: `tests/lib/sponsors/landing.test.ts`, `tests/lib/sponsors/stats.test.ts`

**Interfaces:**
- Consumes: `isSponsorPubliclyVisible` (`src/lib/editorial/sponsors.ts`), `editorialPublicUrl`.
- Produces:
  ```ts
  export type LandingSponsor = { id: string; name: string; tier: 'MAIN' | 'OFFICIAL'; logoUrl: string | null; tagline: string | null; ctaLabel: string | null; hasCta: boolean; hasWebsite: boolean }
  export type LandingSponsors = { seasonId: string; main: LandingSponsor[]; official: LandingSponsor[]; byTarget: Record<string, LandingSponsor> }  // byTarget: target → auspiciador de esa temporada
  export type SponsorRowForLanding = Pick<Sponsor, 'id'|'name'|'tier'|'logoStoragePath'|'tagline'|'ctaLabel'|'ctaUrl'|'websiteUrl'|'isActive'|'startsAt'|'endsAt'|'showOnLanding'|'sortOrder'|'seasonId'>
  export function pickLandingSeasonId(rows: SponsorRowForLanding[], seasonsByRecency: string[], now: Date): string | null
  export function buildLandingSponsors(input: { seasonId: string; sponsors: SponsorRowForLanding[]; assignments: Array<{ target: string; sponsorId: string }>; now: Date }): LandingSponsors | null
  export function courtTarget(court: number): string            // 'court:3'
  export function phaseTarget(phase: 'FINAL'|'THIRD_PLACE'|'FIFTH_PLACE'): string
  export function sponsorClickHref(sponsorId: string, to: 'cta' | 'web'): string  // `/api/public/sponsors/${id}/click?to=${to}`
  // stats.ts
  export function statMonth(now: Date): Date                    // inicio de mes America/Santiago en UTC
  export function looksLikeBot(userAgent: string | null): boolean
  export function resolveClickTarget(s: { ctaUrl: string | null; websiteUrl: string | null }, to: 'cta'|'web'): string | null
  ```

- [ ] **Step 1: Tests que fallan** (`landing.test.ts`):
  - `pickLandingSeasonId` devuelve la temporada más reciente con al menos un auspiciador visible y `showOnLanding`; ignora una temporada más nueva cuyos auspiciadores tienen `showOnLanding=false` o `endsAt` vencido; `null` si ninguna.
  - `buildLandingSponsors` separa `main`/`official`, ordena por `sortOrder` y luego nombre (`localeCompare` es-CL), excluye inactivos, vencidos y `showOnLanding=false`; devuelve `null` si queda vacío.
  - `byTarget` incluye solo asignaciones cuyo auspiciador es visible (asignación a uno vencido no aparece) — Review Focus 1. Una asignación a un auspiciador visible pero con `showOnLanding=false` **sí** aparece en `byTarget` (presentar cancha no exige estar en la franja), pero no en `main/official`.
  - `courtTarget(3) === 'court:3'`, `phaseTarget('FINAL') === 'phase:FINAL'`, `sponsorClickHref('s1','cta') === '/api/public/sponsors/s1/click?to=cta'`.
- [ ] **Step 2: Tests que fallan** (`stats.test.ts`):
  - `statMonth(new Date('2026-11-12T15:00:00Z')).toISOString() === '2026-11-01T03:00:00.000Z'`; `statMonth(new Date('2026-12-01T02:30:00Z'))` (aún 30-nov en Santiago) → `'2026-11-01T03:00:00.000Z'`; en horario de verano (abril 2026: `statMonth(new Date('2026-04-15T12:00:00Z'))`) → `'2026-04-01T03:00:00.000Z'`.
  - `looksLikeBot` true para `Googlebot/2.1`, `facebookexternalhit/1.1`, `WhatsApp/2.23`, `Slackbot-LinkExpanding`, `null`; false para un UA de Chrome móvil.
  - `resolveClickTarget({ctaUrl:'https://wa.me/1', websiteUrl:'https://x.cl'}, 'cta') === 'https://wa.me/1'`; con `ctaUrl:null` y `'cta'` → websiteUrl; ambos null → `null`; `'web'` → websiteUrl (o ctaUrl si no hay web).
- [ ] **Step 3:** `npx vitest run tests/lib/sponsors` → FAIL.
- [ ] **Step 4:** Implementar. `statMonth`: obtener año/mes con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year, month })` y calcular el instante UTC de la medianoche del día 1 en Santiago (probar offset -3 y -4 y quedarse con el que da día 1 00:00 en Santiago).
- [ ] **Step 5:** `npx vitest run tests/lib/sponsors` → PASS. Commit `feat: logica de auspiciadores del landing y estadisticas`.

### Task 3: Carga desde la base y rutas públicas de clic y vistas

**Files:**
- Create: `src/lib/sponsors/landing-query.ts`
- Create: `src/lib/sponsors/stats-store.ts`
- Create: `src/app/api/public/sponsors/[sponsorId]/click/route.ts`
- Create: `src/app/api/public/sponsors/views/route.ts`
- Modify: `src/lib/proxy-policy.ts` (`isPublicRequest`)
- Test: `tests/api/public-sponsors.test.ts`, `tests/lib/proxy-policy.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  ```ts
  export async function getLandingSponsors(organizationId: string, now?: Date): Promise<LandingSponsors | null>
  export async function recordSponsorStat(sponsorIds: string[], kind: 'views' | 'clicks', now?: Date): Promise<void> // upsert + increment, uno por id
  ```
- `GET /api/public/sponsors/[sponsorId]/click?to=cta|web`: busca el auspiciador (con `season.organization.slug`); si no existe o no es visible → 302 a `/` (o al landing `/<slug>` si existe). Si visible: suma clic salvo bot, 302 a `resolveClickTarget`; si no hay URL → 302 a `/<slug>`. `Cache-Control: no-store`.
- `POST /api/public/sponsors/views` body `{ organizationSlug: string, sponsorIds: string[] }` (Zod, máx. 20 ids): filtra a auspiciadores visibles de esa organización con `showOnLanding` o con asignaciones; suma vistas salvo bot; responde 204. Errores de validación → 400.

- [ ] **Step 1: Tests que fallan** (mockear `@/lib/db` como en `tests/api/admin-sponsors.test.ts`):
  - clic a auspiciador visible con `to=cta` → 302 a `ctaUrl` y `sponsorMonthlyStat.upsert` llamado con `clicks: { increment: 1 }`.
  - clic con UA `Googlebot` → 302 igual, sin upsert.
  - clic a auspiciador vencido → 302 a `/kelme`, sin upsert (Review Focus 1).
  - clic a id inexistente → 302 a `/`.
  - vistas con un id de otra organización y uno propio → upsert solo del propio (Review Focus 4); 21 ids → 400.
  - `isPublicRequest('GET','/api/public/sponsors/abc/click')` y `isPublicRequest('POST','/api/public/sponsors/views')` → true; `isPublicRequest('DELETE','/api/public/sponsors/views')` → false.
- [ ] **Step 2:** `npx vitest run tests/api/public-sponsors.test.ts tests/lib/proxy-policy.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. `getLandingSponsors`: cargar temporadas de la organización por `startDate desc`, sponsors de esas temporadas, `pickLandingSeasonId`; si `null`, aún devolver `byTarget` de asignaciones visibles de la temporada más reciente con asignaciones (si tampoco hay, `null`); cargar asignaciones de la temporada elegida y `buildLandingSponsors`.
- [ ] **Step 4:** Tests → PASS; `npx tsc --noEmit` limpio. Commit `feat: rutas publicas de clics y vistas de auspiciadores`.

### Task 4: Panel — campos, asignaciones y estadísticas

**Files:**
- Modify: `src/lib/editorial/sponsors.ts` (`createSponsor`, `updateSponsor` guardan los campos nuevos; nuevas `listSponsorAssignmentSlots`, `setSponsorAssignment`, `listSponsorStats`)
- Create: `src/app/api/admin/seasons/[id]/sponsors/assignments/route.ts` (PUT)
- Modify: `src/components/admin/content/SponsorsTable.tsx` (`SponsorForm` + tabla)
- Create: `src/components/admin/content/SponsorAssignments.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/content/sponsors/page.tsx`
- Test: `tests/lib/editorial-sponsors.test.ts`, `tests/api/admin-sponsors.test.ts`

**Interfaces:**
- Consumes: Task 1 (`sponsorAssignmentSchema`), Task 2 (`statMonth`, `courtTarget`, `phaseTarget`).
- Produces:
  ```ts
  export async function listSponsorAssignmentSlots(seasonId: string): Promise<Array<{ target: string; label: string; sponsorId: string | null }>>
  // canchas = valores distintos no nulos de Match.court de la temporada, ordenados ("Cancha 1");
  // fases = FINAL/THIRD_PLACE/FIFTH_PLACE presentes en Match.phase ("Final", "3.er puesto", "5.º puesto")
  export async function setSponsorAssignment(seasonId: string, input: SponsorAssignmentInput): Promise<'ok' | 'not_found'>
  // sponsorId null → deleteMany; si no, verificar que el auspiciador sea de la temporada y upsert por (seasonId,target)
  export async function listSponsorStats(seasonId: string, now: Date): Promise<Record<string, { current: { views: number; clicks: number }; previous: { views: number; clicks: number } }>>
  ```
- Ruta `PUT /api/admin/seasons/[id]/sponsors/assignments` body `SponsorAssignmentInput`: `requireAdminSeason` + `enforceCapability(organizationId,'MANAGE_LEAGUE_CONTENT')`, 400 Zod, 404 si `not_found`, 200 `{ ok: true }`.

- [ ] **Step 1: Tests que fallan:**
  - `createSponsor` persiste `tier`, `tagline`, `ctaLabel`, `ctaUrl`, `showOnLanding`; `updateSponsor` actualiza solo los presentes.
  - `listSponsorAssignmentSlots` con partidos court [2,1,null,2] y fases [GROUP, FINAL] → `[court:1, court:2, phase:FINAL]` con labels `Cancha 1`, `Cancha 2`, `Final`; sin partidos → `[]` (Review Focus 5).
  - `setSponsorAssignment` con auspiciador de otra temporada → `'not_found'`; con `sponsorId: null` → `deleteMany`.
  - Ruta PUT: target inválido → 400; plan sin capacidad → 403.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementar lógica y ruta. UI: `SponsorForm` con selector "Nivel" (Principal/Oficial), casilla "Mostrar en el landing", campos "Frase u oferta", "Texto del botón", "Enlace del botón". `SponsorAssignments` (cliente): una fila por slot con `<select>` de auspiciadores de la temporada + "Sin auspiciador", guardado al cambiar con `submitJson` y `router.refresh()`; si no hay slots, texto "Esta temporada aún no tiene partidos con cancha ni definiciones." `SponsorsTable`: columnas Nivel, Landing, "Vistas / clics (mes)" y "(mes anterior)". La página carga slots y stats en paralelo.
- [ ] **Step 4:** Tests → PASS; `npx tsc --noEmit` y `npx eslint` sobre los archivos tocados limpios. Commit `feat: panel de auspiciadores con landing, canchas y estadisticas`.

### Task 5: Landing — franja, tarjetas, canchas y definiciones

**Files:**
- Create: `src/components/marketing/sponsors/SponsorStrip.tsx`, `SponsorCards.tsx`, `SponsorViewBeacon.tsx` (cliente), `SponsorMark.tsx` (logo chico + nombre enlazado)
- Modify: `src/app/(tenant)/[organizationSlug]/page.tsx` (cargar `getLandingSponsors`)
- Modify: `src/components/marketing/OrgPublicLanding.tsx` (prop `sponsors: LandingSponsors | null`, ubicar franja/tarjetas, cancha en partido destacado/próximo)
- Modify: `src/lib/org-public-landing.ts` (agregar `court: number | null` y `seasonId` a filas de partido usadas por el landing)
- Modify: `src/components/marketing/KelmeCupFixture.tsx` (`CourtPill` y tarjeta de definiciones con auspiciador)
- Modify: `src/lib/kelme-fixture/view.ts` solo si hace falta exponer `seasonId` (ya existe en `FixtureView`)
- Test: `tests/components/sponsors.test.tsx`

**Interfaces:**
- Consumes: `LandingSponsors`, `courtTarget`, `phaseTarget`, `sponsorClickHref` (Task 2), `getLandingSponsors` (Task 3).
- Produces: `<SponsorStrip sponsors={LandingSponsors} tone="kelme" | "org" />`, `<SponsorCards sponsors tone />`, `<SponsorViewBeacon organizationSlug sponsorIds={string[]} />`, `<SponsorMark sponsor={LandingSponsor} prefix?: string />`. `KelmeCupFixture` recibe prop opcional `sponsorsByTarget?: Record<string, LandingSponsor>` (solo aplica si `sponsors.seasonId === view.seasonId`; si no, se pasa `{}`).

- [ ] **Step 1: Tests de componentes que fallan** (Testing Library, patrón de `tests/components`):
  - `SponsorStrip` con 1 principal y 2 oficiales: el principal primero; cada enlace con `href` `/api/public/sponsors/<id>/click?to=web`, `rel` con `sponsored` y `noopener`, `target="_blank"`; auspiciador sin logo muestra su nombre.
  - `SponsorCards`: tarjeta con `ctaLabel` y `hasCta` renderiza botón con `?to=cta`; sin `ctaLabel` no hay botón; muestra `tagline`.
  - `KelmeCupFixture` con `sponsorsByTarget={{'court:1': X, 'phase:FINAL': Y}}`: la píldora de cancha 1 contiene "Cancha 1 · X"; cancha 2 solo "Cancha 2"; la tarjeta de la Final muestra "Final presentada por Y". Para THIRD_PLACE/FIFTH_PLACE el texto es "3.er puesto presentado por" / "5.º puesto presentado por".
  - `SponsorViewBeacon`: al montar llama `fetch('/api/public/sponsors/views', { method:'POST', keepalive:true, ... })` una vez; al volver a montar en la misma pestaña con los mismos ids no vuelve a llamar (sessionStorage key `sponsor-views:<slug>:<ids ordenados>`); si `sessionStorage` lanza error, igual envía una vez y no rompe (Review Focus 3).
- [ ] **Step 2:** `npx vitest run tests/components/sponsors.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar. Ubicación: en Kelme, `SponsorStrip` justo después de `KelmeCupHomeHero` y `SponsorCards` antes de `KelmeCupInvite`; en el landing genérico, franja después del hero/cabecera y tarjetas antes del pie. Estilo Kelme: fondo `#f4f9ff`, títulos `font-display` uppercase "Auspiciadores" / "Nuestros auspiciadores", principal en tarjeta de ancho completo con borde `#1A7AE8`; genérico usa `org-primary`. Logos de la franja en `grayscale` con `hover:grayscale-0`, alto 40 px (principal 56 px). `SponsorViewBeacon` envía los ids de franja + tarjetas + marcas de cancha/final visibles. En el landing genérico, si el partido destacado o el próximo tiene `court`, mostrar "Cancha N" y, si hay auspiciador para `court:N` en su temporada, "Cancha N · X".
- [ ] **Step 4:** Tests → PASS; `npx vitest run` completo verde; `npx tsc --noEmit`, `npx eslint src tests` sin errores nuevos.
- [ ] **Step 5:** Revisión visual local: `npm run dev`, abrir `/kelme` sin auspiciadores (debe verse igual que hoy) y con 1 principal + 2 oficiales cargados en una base local o de preview; captura de escritorio y móvil (375 px) sin scroll horizontal.
- [ ] **Step 6:** Commit `feat: auspiciadores en el landing de cada liga`.

### Task 6: Verificación final y despliegue (requiere autorización)

- [ ] **Step 1:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint src tests` → todo verde.
- [ ] **Step 2:** Pedir autorización al usuario. Con autorización: `git push origin main`, `npx vercel deploy --prod --yes` (el build aplica la migración con `prisma migrate deploy`), `vercel inspect <url> --wait`, y comprobar `https://ligalab.cl/kelme` → 200 sin sección de auspiciadores hasta que se marquen con "Mostrar en el landing".
- [ ] **Step 3:** Indicar al usuario cómo cargar sus 3 auspiciadores: Contenido → Patrocinadores → temporada KELME CUP → nivel, logo, frase, botón, "Mostrar en el landing", y asignar canchas/finales.
