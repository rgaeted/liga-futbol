# App móvil por temporada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat each published `SeasonMobileConfig` as a product: stricter publish rules, platform inventory, a scaffolding script for the next Expo edition, and 503 when the parent organization is paused. Do not auto-submit to App Store or Play.

**Architecture:** Keep `/api/mobile/v1/leagues/[slug]/*` and the Kelme Invierno 2026 edition folder. Tighten PUT `/api/admin/seasons/[id]/mobile` (immutable slug from first save, logo + ≥1 registered team, reserved slugs). `resolvePublishedLeagueBySlug` checks `season.organization.status`. Script writes `apps/mobile/editions/<slug>/` from DB.

**Tech Stack:** Next.js 16, Prisma 7 (no new tables), Zod 4, Vitest 4, Expo edition config files, Node `fs`.

**Spec:** `docs/superpowers/specs/2026-08-14-app-movil-por-temporada-design.md`

**Independent of:** jugador único, árbitros, desafíos.

## Global Constraints

- UI: español chileno, tú.
- Do not regenerate `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026`.
- Do not add EAS Submit, store credentials, or in-app login.
- Do not change mobile JSON contracts except 503 on paused org.
- Existing PUT already requires **2** registered teams to publish. Spec wants **≥1** plus logo. Follow the spec: at least **1** `SeasonTeam` REGISTERED and `logoStoragePath` set.
- Slug becomes immutable after **create**, not only after publish (stricter than current code).
- Commits one per task.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/mobile-edition-slug.ts` | Parse edition slug vs reserved org slugs |
| `src/lib/mobile/league-context.ts` | 503 paused org |
| `src/app/api/admin/seasons/[id]/mobile/route.ts` | Immutable slug, logo, 1 team |
| `src/lib/validations/mobile-season.ts` | Reserved slug refine |
| `src/app/api/plataforma/mobile-editions/route.ts` | Inventory JSON |
| `src/app/plataforma/apps/page.tsx` | Inventory UI |
| `scripts/create-mobile-edition.ts` | Scaffold Expo folder |
| `src/lib/mobile-edition-scaffold.ts` | Pure file payloads for tests |
| `docs/operations/mobile-edition.md` | Store checklist |
| `src/components/admin/season-mobile/*` | Wizard copy + bundle preview |

---

### Task 1: Edition slug parser

**Files:**
- Create: `src/lib/mobile-edition-slug.ts`
- Test: `tests/lib/mobile-edition-slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parseMobileEditionSlug } from '@/lib/mobile-edition-slug'
import { RESERVED_ORGANIZATION_SLUGS } from '@/lib/organization-slug'

describe('parseMobileEditionSlug', () => {
  it('accepts kelme-invierno-puerto-varas-2026', () => {
    expect(parseMobileEditionSlug('kelme-invierno-puerto-varas-2026')).toEqual({
      ok: true,
      slug: 'kelme-invierno-puerto-varas-2026',
    })
  })

  it('rejects reserved org slugs', () => {
    for (const slug of RESERVED_ORGANIZATION_SLUGS) {
      expect(parseMobileEditionSlug(slug)).toEqual({ ok: false, error: 'reserved' })
    }
  })

  it('rejects uppercase', () => {
    expect(parseMobileEditionSlug('Kelme').ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/mobile-edition-slug.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
import {
  ORGANIZATION_SLUG_REGEX,
  RESERVED_ORGANIZATION_SLUGS,
  type ParseSlugResult,
} from '@/lib/organization-slug'

export function parseMobileEditionSlug(raw: string): ParseSlugResult {
  if (!ORGANIZATION_SLUG_REGEX.test(raw)) return { ok: false, error: 'invalid' }
  if (RESERVED_ORGANIZATION_SLUGS.has(raw)) return { ok: false, error: 'reserved' }
  return { ok: true, slug: raw }
}

export function nativeBundleIdPreview(organizationSlug: string, editionSlug: string): string {
  const seasonKey = editionSlug.replace(/[^a-z0-9]/g, '')
  return `cl.admintorneo.${organizationSlug}.${seasonKey}`.slice(0, 155)
}
```

- [ ] **Step 4: Run tests**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mobile-edition-slug.ts tests/lib/mobile-edition-slug.test.ts
git commit -m "feat: validate mobile edition slugs"
```

---

### Task 2: Publish guards + immutable slug

**Files:**
- Modify: `src/lib/validations/mobile-season.ts`
- Modify: `src/app/api/admin/seasons/[id]/mobile/route.ts`
- Test: `tests/api/admin-season-mobile.test.ts`

- [ ] **Step 1: Refine schema**

After `slug` regex, add `.superRefine` calling `parseMobileEditionSlug`; if not ok, `ctx.addIssue` `'El slug está reservado'` or `'Slug inválido'`.

- [ ] **Step 2: PUT changes**

```ts
const parsedSlug = parseMobileEditionSlug(parsed.data.slug)
if (!parsedSlug.ok) {
  return NextResponse.json(
    { error: parsedSlug.error === 'reserved' ? 'El slug está reservado' : 'Slug inválido' },
    { status: 400 },
  )
}

if (existing && existing.slug !== parsed.data.slug) {
  return NextResponse.json(
    { error: 'El slug no se puede cambiar después' },
    { status: 400 },
  )
}

if (wantsPublish) {
  const registered = await countRegisteredTeamsForSeason(id)
  if (registered < 1) {
    return NextResponse.json(
      { error: 'Debes inscribir al menos un equipo antes de publicar' },
      { status: 400 },
    )
  }
  const logoPath = existing?.logoStoragePath
  if (!logoPath) {
    return NextResponse.json(
      { error: 'Sube el logo de la edición antes de publicar' },
      { status: 400 },
    )
  }
}
```

On **create** (no existing), `update` branch is unused; create may set `isPublished` only if logo already exists — first PUT often has no logo. If `wantsPublish && !existing`, still 400 for missing logo.

Remove the old “2 equipos” and “solo después de publicar” slug rules.

- [ ] **Step 3: Tests** (mock `requireAdminSeason` + db)

1. Second PUT with different slug → 400 `'El slug no se puede cambiar después'`
2. Publish with 0 teams → 400
3. Publish with 1 team and logo → 200
4. Reserved slug `admin` → 400

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/mobile-season.ts src/app/api/admin/seasons/[id]/mobile/route.ts tests/api/admin-season-mobile.test.ts
git commit -m "feat: lock mobile edition slug and publish requirements"
```

---

### Task 3: Paused org → mobile API 503

**Files:**
- Modify: `src/lib/mobile/league-context.ts`
- Test: `tests/lib/mobile-league-context.test.ts` (create if missing) or extend existing mobile API tests

- [ ] **Step 1: Include organization status**

In `resolvePublishedLeagueBySlug`, `include.season` add `organization: { select: { status: true } }`. After config found:

```ts
import { OrganizationStatus } from '@prisma/client'
import { pausedOrganizationPayload } from '@/lib/organization-status'

if (config.season.organization.status === OrganizationStatus.PAUSED) {
  throw new MobileApiError(503, pausedOrganizationPayload().error)
}
```

Callers already use `mobileErrorResponse`. Confirm GET handlers catch `MobileApiError`.

If `season` type in `ResolvedMobileLeague` currently is Prisma `Season` without organization, extend the type:

```ts
season: Season & { organization: { status: OrganizationStatus } }
```

or select organization separately.

- [ ] **Step 2: Test** — mock db.findFirst returning paused org; expect `MobileApiError` status 503 message `'Organización no disponible'`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mobile/league-context.ts tests/lib/mobile-league-context.test.ts
git commit -m "feat: pause mobile league API when organization is paused"
```

---

### Task 4: Admin wizard copy + bundle preview

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/seasons/[id]/mobile/page.tsx`
- Modify: `src/components/admin/season-mobile/SeasonRosterEditor.tsx` (or the client that edits config) — search for `isPublished` / slug inputs.

- [ ] **Step 1: Pass `organizationSlug` into the client.** Show read-only slug after config exists. Show `nativeBundleIdPreview(organizationSlug, slug)` as “Identificador sugerido para la app nativa”. Confirm copy: “La API pública quedará abierta con este slug. La app de tienda se genera aparte.” before publish.

- [ ] **Step 2: On content page** `admin/content/page.tsx`, if `mobileConfig` exists show Publicado/Borrador + slug; if not, keep current “Configura la edición móvil…” link to `/admin/seasons/[id]/mobile`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/(dashboard)/admin/seasons/[id]/mobile/page.tsx src/components/admin/season-mobile src/app/(tenant)/[organizationSlug]/(dashboard)/admin/content/page.tsx
git commit -m "feat: mobile edition wizard product copy"
```

---

### Task 5: Platform inventory

**Files:**
- Create: `src/app/api/plataforma/mobile-editions/route.ts`
- Create: `src/app/plataforma/apps/page.tsx`
- Modify: `src/app/plataforma/layout.tsx` — link “Apps”

- [ ] **Step 1: GET** `requirePlatformAdmin`

```ts
const rows = await db.seasonMobileConfig.findMany({
  orderBy: { updatedAt: 'desc' },
  include: {
    season: {
      select: {
        name: true,
        organization: { select: { name: true, slug: true } },
      },
    },
  },
})
return NextResponse.json({
  editions: rows.map((row) => ({
    seasonId: row.seasonId,
    slug: row.slug,
    displayName: row.displayName,
    isPublished: row.isPublished,
    organizationName: row.season.organization.name,
    organizationSlug: row.season.organization.slug,
    seasonName: row.season.name,
    scaffoldHint: 'Crea la carpeta Expo con scripts/create-mobile-edition.ts',
  })),
})
```

Do not probe the filesystem at runtime.

- [ ] **Step 2: Page** table: org | temporada | slug | Publicado sí/no | hint “Scaffold pendiente”.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/plataforma/mobile-editions/route.ts src/app/plataforma/apps/page.tsx src/app/plataforma/layout.tsx
git commit -m "feat: platform inventory of mobile editions"
```

---

### Task 6: Scaffold payloads (pure)

**Files:**
- Create: `src/lib/mobile-edition-scaffold.ts`
- Test: `tests/lib/mobile-edition-scaffold.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildEditionConfigSource, editionFolderName } from '@/lib/mobile-edition-scaffold'

describe('buildEditionConfigSource', () => {
  it('emits edition.config.ts with slug and bundle preview', () => {
    const source = buildEditionConfigSource({
      slug: 'kelme-verano-2027',
      displayName: 'Kelme Verano 2027',
      shortName: 'Kelme 2027',
      organizationSlug: 'kelme',
      seasonId: 'season-1',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      apiBaseUrl: 'https://torneos-kelme.vercel.app',
    })
    expect(source).toContain("key: 'kelme-verano-2027'")
    expect(source).toContain('cl.admintorneo.kelme.')
    expect(source).toContain('seasonId: season-1')
    expect(editionFolderName('kelme-verano-2027')).toBe('kelme-verano-2027')
  })
})
```

- [ ] **Step 2: Implement** a template string matching `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/edition.config.ts` shape (`urlScheme` = slug without hyphens, `iosBundleIdentifier` and `androidPackage` = `nativeBundleIdPreview`). Include a comment `// seasonId: ... organizationSlug: ...`.

Also export:

```ts
export function editionIndexPatch(existingSource: string, slug: string): string {
  if (existingSource.includes(`'${slug}'`)) return existingSource
  const importLine = `import ${camel(slug)} from '../../editions/${slug}/edition.config'\n`
  // insert import after last import, and `[${camel(slug)}.key]: ${camel(slug)},` inside EDITIONS
}
```

Keep `camel` deterministic: split on `-`, join camelCase.

If `editionIndexPatch` is error-prone, Task 7 script can append a clearly delimited block; still test that patch is idempotent (second call unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/lib/mobile-edition-scaffold.ts tests/lib/mobile-edition-scaffold.test.ts
git commit -m "feat: build Expo edition.config source from SeasonMobileConfig"
```

---

### Task 7: create-mobile-edition script

**Files:**
- Create: `scripts/create-mobile-edition.ts`
- Test: `tests/scripts/create-mobile-edition.test.ts` — extract `runCreateMobileEdition(fsLike, args)` from the script into `src/lib/mobile-edition-scaffold.ts` as `applyMobileEditionScaffold` so tests use a memfs or a temp dir.

- [ ] **Step 1: `applyMobileEditionScaffold`**

Args: `{ slug, force, repoRoot, config, files: { exists, mkdir, copyDir, writeFile, readFile } }`.

Behavior:

1. If `apps/mobile/editions/<slug>` exists and `!force` → throw `'La carpeta de edición ya existe'`
2. `mkdir` edition dir
3. `copyDir` from `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets` to new `assets` (if assets missing, mkdir empty assets)
4. `writeFile` `edition.config.ts` from `buildEditionConfigSource`
5. Patch `apps/mobile/src/lib/edition.ts` via `editionIndexPatch`

- [ ] **Step 2: CLI**

```ts
const slug = process.argv.find((a) => a.startsWith('--slug='))?.slice(7)
const force = process.argv.includes('--force')
```

Load `db.seasonMobileConfig.findUnique({ where: { slug }, include: { season: { include: { organization: true } } } })`. Missing → `console.error` + `process.exit(1)`.

`apiBaseUrl` = `process.env.PUBLIC_APP_URL ?? 'https://torneos-kelme.vercel.app'`. Colors: config.primaryColor ?? organization.primaryColor.

Print:

```
EDITION=<slug> npx eas build --platform ios
EDITION=<slug> npx eas build --platform android
```

and “Sigue docs/operations/mobile-edition.md”.

- [ ] **Step 3: Test with temp directory** (`fs.mkdtempSync`) containing a fake `edition.ts` EDITIONS object and fake assets file `icon.png`. After apply, expect new config file and patched import.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-mobile-edition.ts src/lib/mobile-edition-scaffold.ts tests/scripts/create-mobile-edition.test.ts
git commit -m "feat: scaffold Expo editions from published season config"
```

---

### Task 8: Operations doc

**Files:**
- Create: `docs/operations/mobile-edition.md`

Write the full doc (no placeholders):

1. Create `SeasonMobileConfig` in `/{org}/admin/seasons/[id]/mobile`, upload logo, enroll ≥1 team, publish.
2. `npx tsx scripts/create-mobile-edition.ts --slug=<slug>`
3. Bundle id convention `cl.admintorneo.<orgSlug>.<seasonKey>`
4. Paste icon/splash into `apps/mobile/editions/<slug>/assets/`
5. EAS: new profile in `eas.json` keyed by edition, `EDITION=<slug>`
6. Privacy URL `https://torneos-kelme.vercel.app/privacidad/app`
7. Do not run this against the piloto `liga-invierno-kelme-puerto-varas-2026`
8. Org paused → API 503; unpublish → 404

- [ ] **Step 1: Write the file**
- [ ] **Step 2: Commit**

```bash
git add docs/operations/mobile-edition.md
git commit -m "docs: mobile edition store checklist"
```

---

### Task 9: Verification

- [ ] **Step 1: Run**

Run: `npx vitest run tests/lib/mobile-edition-slug.test.ts tests/api/admin-season-mobile.test.ts tests/lib/mobile-league-context.test.ts tests/lib/mobile-edition-scaffold.test.ts tests/scripts/create-mobile-edition.test.ts`

Expected: PASS

- [ ] **Step 2: Confirm piloto `apps/mobile/src/lib/edition.ts` still registers `liga-invierno-kelme-puerto-varas-2026` only** unless a scaffold test used a temp copy.

- [ ] **Step 3: Confirm `countRegisteredTeamsForSeason` export still used by enrollment if anything imported the old “2 teams” message — grep `al menos dos equipos` and update copy.
