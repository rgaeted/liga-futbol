# Kelme Cup Los Lagos 2026 — edición móvil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `SeasonMobileConfig` `kelme-cup-los-lagos-2026` sobre la temporada Copa Kelme Los Lagos y dejar la carpeta Expo compilable, sin EAS ni tiendas.

**Architecture:** Un módulo puro fija identidad, copy y guards. Un script de ops encuentra la temporada existente, sube el escudo a Storage y publica la config. La carpeta Expo se escribe con `applyMobileEditionScaffold` (mismos helpers que `create-mobile-edition.ts`) y assets Cup; el piloto Invierno no se toca. La API móvil v1 ya existe: en prod basta el row publicado + logo, sin deploy de Next.

**Tech Stack:** TypeScript, Vitest, Prisma 7, tsx, Supabase Storage (`editorial`), Expo edition config, sharp (solo assets Cup).

**Spec:** `docs/superpowers/specs/2026-09-11-kelme-cup-mobile-edition-design.md`

## Global Constraints

- UI y copy: español chileno, tú (no voseo).
- Slug de edición: `kelme-cup-los-lagos-2026` (inmutable, distinto del slug de org `kelme`).
- Temporada: solo `Copa Kelme Los Lagos` en org `kelme`. No crear otra season.
- Colores: primario `#1A7AE8`, secundario `#0B3D8F`.
- Display: `Kelme Cup Los Lagos 2026`. Corto: `Kelme Cup`.
- Bundle / package: `cl.admintorneo.kelme.kelmecuploslagos2026`. Scheme: `kelmecuploslagos2026`.
- `apiBaseUrl` default: `https://ligalab.cl`.
- Logo CMS: escudo `public/branding/kelme-cup-shield.png` en `logoStoragePath` (396664 bytes, cabe en el límite editorial de 2 MiB).
- Publicar exige logo + ≥1 `SeasonTeam` `REGISTERED`.
- No regenerar ni rebrandear `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026`.
- No correr `eas build`, EAS Submit, TestFlight ni publicar en tiendas.
- No añadir login, amistosos ni pantallas Expo nuevas.
- No cambiar paths `/api/mobile/v1/leagues/[slug]/*`.
- No commitear `.env`, `docs/handoff/`, `body.txt`, `cookies*.txt`, `headers.txt`, ni el WIP de admin players.
- Commits: uno por task.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/kelme-cup-mobile-edition.ts` | Identidad, descripción, scaffold config, guards de publish, path de logo |
| `tests/lib/kelme-cup-mobile-edition.test.ts` | Tests del módulo puro |
| `scripts/publish-kelme-cup-mobile-edition.ts` | Prisma + Storage: upsert, subir escudo, publicar |
| `package.json` | Script `db:publish:kelme-cup-mobile` |
| `apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts` | Identidad nativa Expo |
| `apps/mobile/editions/kelme-cup-los-lagos-2026/assets/` | icon / splash / adaptive-icon Cup |
| `apps/mobile/src/lib/edition.ts` | Registrar la segunda edición |
| `scripts/generate-kelme-cup-mobile-assets.mjs` | Genera PNG nativos desde el escudo (solo carpeta Cup) |
| `tests/lib/kelme-cup-mobile-edition-files.test.ts` | Asserts de archivos Expo en disco |
| `docs/operations/mobile-edition.md` | Anotar que esta edición existe y no es el piloto |

---

### Task 1: Identidad y guards puros

**Files:**
- Create: `src/lib/kelme-cup-mobile-edition.ts`
- Create: `tests/lib/kelme-cup-mobile-edition.test.ts`

**Interfaces:**
- Consumes: `KELME_CUP`, `KELME_CUP_PRIMARY`, `KELME_CUP_SECONDARY` from `src/lib/org-brand.ts`; `CUP_ORG_SLUG` from `src/lib/copa-kelme-los-lagos.ts`; `parseMobileEditionSlug`, `nativeBundleIdPreview` from `src/lib/mobile-edition-slug.ts`; `buildEditionConfigSource`, `EditionScaffoldConfig` from `src/lib/mobile-edition-scaffold.ts`; `editorialStoragePath` from `src/lib/editorial/urls.ts`
- Produces:
  - `KELME_CUP_MOBILE_SLUG = 'kelme-cup-los-lagos-2026'`
  - `KELME_CUP_MOBILE_DISPLAY_NAME = 'Kelme Cup Los Lagos 2026'`
  - `KELME_CUP_MOBILE_SHORT_NAME = 'Kelme Cup'`
  - `KELME_CUP_MOBILE_API_BASE_URL = 'https://ligalab.cl'`
  - `KELME_CUP_MOBILE_BUNDLE_ID = 'cl.admintorneo.kelme.kelmecuploslagos2026'`
  - `KELME_CUP_MOBILE_URL_SCHEME = 'kelmecuploslagos2026'`
  - `kelmeCupMobileDescription(): string`
  - `kelmeCupMobileScaffoldConfig(seasonId: string): EditionScaffoldConfig`
  - `kelmeCupMobileLogoStoragePath(seasonId: string): string`
  - `assertKelmeCupMobilePublishReady(input: { registeredTeamCount: number; logoStoragePath: string | null }): { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/kelme-cup-mobile-edition.test.ts
import { describe, expect, it } from 'vitest'
import { CUP_ORG_SLUG } from '@/lib/copa-kelme-los-lagos'
import {
  KELME_CUP_MOBILE_API_BASE_URL,
  KELME_CUP_MOBILE_BUNDLE_ID,
  KELME_CUP_MOBILE_DISPLAY_NAME,
  KELME_CUP_MOBILE_SHORT_NAME,
  KELME_CUP_MOBILE_SLUG,
  KELME_CUP_MOBILE_URL_SCHEME,
  assertKelmeCupMobilePublishReady,
  kelmeCupMobileDescription,
  kelmeCupMobileLogoStoragePath,
  kelmeCupMobileScaffoldConfig,
} from '@/lib/kelme-cup-mobile-edition'
import { nativeBundleIdPreview, parseMobileEditionSlug } from '@/lib/mobile-edition-slug'
import { buildEditionConfigSource } from '@/lib/mobile-edition-scaffold'
import { KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '@/lib/org-brand'

describe('kelme cup mobile edition identity', () => {
  it('accepts the edition slug and rejects the org slug as edition slug', () => {
    expect(parseMobileEditionSlug(KELME_CUP_MOBILE_SLUG)).toEqual({
      ok: true,
      slug: 'kelme-cup-los-lagos-2026',
    })
    expect(KELME_CUP_MOBILE_SLUG).not.toBe('kelme')
  })

  it('matches the native bundle convention', () => {
    expect(nativeBundleIdPreview(CUP_ORG_SLUG, KELME_CUP_MOBILE_SLUG)).toBe(
      KELME_CUP_MOBILE_BUNDLE_ID,
    )
    expect(KELME_CUP_MOBILE_BUNDLE_ID).toBe('cl.admintorneo.kelme.kelmecuploslagos2026')
    expect(KELME_CUP_MOBILE_URL_SCHEME).toBe('kelmecuploslagos2026')
  })

  it('builds flyer-aligned description and scaffold source', () => {
    expect(kelmeCupMobileDescription()).toBe(
      'Torneo infantil de fútbol en Los Lagos. Domingo 25 de octubre, Canchas Colegio Puerto Varas, desde 9:00 a 14:00 horas.',
    )
    const source = buildEditionConfigSource(kelmeCupMobileScaffoldConfig('season-cup-1'))
    expect(source).toContain("slug: 'kelme-cup-los-lagos-2026'")
    expect(source).toContain(`displayName: '${KELME_CUP_MOBILE_DISPLAY_NAME}'`)
    expect(source).toContain(`shortName: '${KELME_CUP_MOBILE_SHORT_NAME}'`)
    expect(source).toContain(KELME_CUP_PRIMARY)
    expect(source).toContain(KELME_CUP_SECONDARY)
    expect(source).toContain(KELME_CUP_MOBILE_API_BASE_URL)
    expect(source).toContain(KELME_CUP_MOBILE_BUNDLE_ID)
    expect(source).not.toContain('#CD212A')
    expect(source).not.toContain('torneos-kelme.vercel.app')
  })

  it('builds the editorial logo path and publish guards', () => {
    expect(kelmeCupMobileLogoStoragePath('ckll-season-1')).toBe(
      'seasons/ckll-season-1/mobile/logo.png',
    )
    expect(
      assertKelmeCupMobilePublishReady({ registeredTeamCount: 0, logoStoragePath: 'x' }),
    ).toEqual({ ok: false, error: 'Debes inscribir al menos un equipo antes de publicar' })
    expect(
      assertKelmeCupMobilePublishReady({ registeredTeamCount: 1, logoStoragePath: null }),
    ).toEqual({ ok: false, error: 'Sube el logo de la edición antes de publicar' })
    expect(
      assertKelmeCupMobilePublishReady({
        registeredTeamCount: 1,
        logoStoragePath: 'seasons/ckll-season-1/mobile/logo.png',
      }),
    ).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/kelme-cup-mobile-edition.test.ts`

Expected: FAIL module not found `@/lib/kelme-cup-mobile-edition`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/kelme-cup-mobile-edition.ts
import { CUP_ORG_SLUG } from '@/lib/copa-kelme-los-lagos'
import { editorialStoragePath } from '@/lib/editorial/urls'
import type { EditionScaffoldConfig } from '@/lib/mobile-edition-scaffold'
import { nativeBundleIdPreview } from '@/lib/mobile-edition-slug'
import { KELME_CUP, KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '@/lib/org-brand'

export const KELME_CUP_MOBILE_SLUG = 'kelme-cup-los-lagos-2026'
export const KELME_CUP_MOBILE_DISPLAY_NAME = 'Kelme Cup Los Lagos 2026'
export const KELME_CUP_MOBILE_SHORT_NAME = 'Kelme Cup'
export const KELME_CUP_MOBILE_API_BASE_URL = 'https://ligalab.cl'
export const KELME_CUP_MOBILE_URL_SCHEME = KELME_CUP_MOBILE_SLUG.replace(/-/g, '')
export const KELME_CUP_MOBILE_BUNDLE_ID = nativeBundleIdPreview(
  CUP_ORG_SLUG,
  KELME_CUP_MOBILE_SLUG,
)

export function kelmeCupMobileDescription(): string {
  const timeLabel =
    KELME_CUP.timeLabel.charAt(0).toLowerCase() + KELME_CUP.timeLabel.slice(1)
  return `${KELME_CUP.subtitle} en ${KELME_CUP.region}. ${KELME_CUP.dateLabel}, ${KELME_CUP.venue}, ${timeLabel}.`
}

export function kelmeCupMobileScaffoldConfig(seasonId: string): EditionScaffoldConfig {
  return {
    slug: KELME_CUP_MOBILE_SLUG,
    displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
    shortName: KELME_CUP_MOBILE_SHORT_NAME,
    organizationSlug: CUP_ORG_SLUG,
    seasonId,
    primaryColor: KELME_CUP_PRIMARY,
    secondaryColor: KELME_CUP_SECONDARY,
    apiBaseUrl: KELME_CUP_MOBILE_API_BASE_URL,
  }
}

export function kelmeCupMobileLogoStoragePath(seasonId: string): string {
  return editorialStoragePath(['seasons', seasonId, 'mobile', 'logo.png'])
}

export function assertKelmeCupMobilePublishReady(input: {
  registeredTeamCount: number
  logoStoragePath: string | null
}): { ok: true } | { ok: false; error: string } {
  if (input.registeredTeamCount < 1) {
    return { ok: false, error: 'Debes inscribir al menos un equipo antes de publicar' }
  }
  if (!input.logoStoragePath) {
    return { ok: false, error: 'Sube el logo de la edición antes de publicar' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run tests/lib/kelme-cup-mobile-edition.test.ts tests/lib/mobile-edition-slug.test.ts tests/lib/org-brand.test.ts`

Expected: PASS. No cambios en Invierno.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kelme-cup-mobile-edition.ts tests/lib/kelme-cup-mobile-edition.test.ts
git commit -m "feat: add Kelme Cup mobile edition identity"
```

---

### Task 2: Script de publish (temporada + logo + isPublished)

**Files:**
- Create: `scripts/publish-kelme-cup-mobile-edition.ts`
- Modify: `package.json` (añadir `"db:publish:kelme-cup-mobile": "tsx scripts/publish-kelme-cup-mobile-edition.ts"` junto a los otros `db:*`)

**Interfaces:**
- Consumes: `KELME_CUP_MOBILE_*`, `kelmeCupMobileDescription`, `kelmeCupMobileLogoStoragePath`, `assertKelmeCupMobilePublishReady` from Task 1; `CUP_ORG_SLUG`, `CUP_SEASON_NAME` from `src/lib/copa-kelme-los-lagos.ts`; `KELME_CUP_PRIMARY`, `KELME_CUP_SECONDARY` from `src/lib/org-brand.ts`; `validateEditorialImage` from `src/lib/editorial/image.ts`; `editorialStorageBucket` from `src/lib/editorial/urls.ts`; Prisma client pattern from `scripts/seed-copa-kelme-los-lagos.ts` (`createPrismaClient` en `prisma/lib/db-client`)
- Produces: script CLI que, de forma idempotente, deja `SeasonMobileConfig` con `slug=kelme-cup-los-lagos-2026`, logo en Storage y `isPublished=true`. Exit 1 si falta org, temporada o equipos `REGISTERED`. No importa `uploadEditorialObject` (`server-only`).

- [ ] **Step 1: Write the script**

El test de guards ya está en Task 1. Este task es I/O. Implementa el script completo:

```ts
#!/usr/bin/env tsx
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SeasonTeamStatus, type PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import type { Pool } from 'pg'
import { CUP_ORG_SLUG, CUP_SEASON_NAME } from '../src/lib/copa-kelme-los-lagos'
import { validateEditorialImage } from '../src/lib/editorial/image'
import { editorialStorageBucket } from '../src/lib/editorial/urls'
import {
  KELME_CUP_MOBILE_DISPLAY_NAME,
  KELME_CUP_MOBILE_SHORT_NAME,
  KELME_CUP_MOBILE_SLUG,
  assertKelmeCupMobilePublishReady,
  kelmeCupMobileDescription,
  kelmeCupMobileLogoStoragePath,
} from '../src/lib/kelme-cup-mobile-edition'
import { KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '../src/lib/org-brand'

let prisma: PrismaClient
let pool: Pool

function getDb() {
  if (!prisma) {
    const mod = require('../prisma/lib/db-client') as typeof import('../prisma/lib/db-client')
    const client = mod.createPrismaClient()
    prisma = client.prisma
    pool = client.pool
  }
  return { prisma, pool }
}

async function uploadLogo(storagePath: string, buffer: Buffer, mimeType: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error('Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)')
  }
  const supabase = createClient(url, secretKey)
  const { error } = await supabase.storage.from(editorialStorageBucket()).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw error
}

async function main() {
  const { prisma, pool } = getDb()
  try {
    const org = await prisma.organization.findUnique({ where: { slug: CUP_ORG_SLUG } })
    if (!org) {
      throw new Error(`No existe la org "${CUP_ORG_SLUG}".`)
    }

    const season = await prisma.season.findFirst({
      where: { organizationId: org.id, name: CUP_SEASON_NAME },
    })
    if (!season) {
      throw new Error(
        `No existe la temporada "${CUP_SEASON_NAME}". Corre: npm run db:seed:copa-kelme-los-lagos`,
      )
    }

    const registeredTeamCount = await prisma.seasonTeam.count({
      where: { seasonId: season.id, status: SeasonTeamStatus.REGISTERED },
    })
    if (registeredTeamCount < 1) {
      throw new Error('Debes inscribir al menos un equipo antes de publicar')
    }

    const existing = await prisma.seasonMobileConfig.findUnique({ where: { seasonId: season.id } })
    if (existing && existing.slug !== KELME_CUP_MOBILE_SLUG) {
      throw new Error(`El slug no se puede cambiar después (actual: ${existing.slug})`)
    }

    const taken = await prisma.seasonMobileConfig.findUnique({
      where: { slug: KELME_CUP_MOBILE_SLUG },
    })
    if (taken && taken.seasonId !== season.id) {
      throw new Error(`El slug ${KELME_CUP_MOBILE_SLUG} ya pertenece a otra temporada`)
    }

    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const shieldPath = path.join(repoRoot, 'public', 'branding', 'kelme-cup-shield.png')
    const buffer = await readFile(shieldPath)
    const mimeType = 'image/png'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) throw new Error(validation.error)

    const logoStoragePath = kelmeCupMobileLogoStoragePath(season.id)
    await prisma.seasonMobileConfig.upsert({
      where: { seasonId: season.id },
      create: {
        seasonId: season.id,
        slug: KELME_CUP_MOBILE_SLUG,
        displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
        shortName: KELME_CUP_MOBILE_SHORT_NAME,
        description: kelmeCupMobileDescription(),
        primaryColor: KELME_CUP_PRIMARY,
        secondaryColor: KELME_CUP_SECONDARY,
        isPublished: false,
      },
      update: {
        displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
        shortName: KELME_CUP_MOBILE_SHORT_NAME,
        description: kelmeCupMobileDescription(),
        primaryColor: KELME_CUP_PRIMARY,
        secondaryColor: KELME_CUP_SECONDARY,
      },
    })

    await uploadLogo(logoStoragePath, buffer, mimeType)
    await prisma.seasonMobileConfig.update({
      where: { seasonId: season.id },
      data: { logoStoragePath },
    })

    const ready = assertKelmeCupMobilePublishReady({
      registeredTeamCount,
      logoStoragePath,
    })
    if (!ready.ok) throw new Error(ready.error)

    const now = new Date()
    const published = await prisma.seasonMobileConfig.update({
      where: { seasonId: season.id },
      data: {
        isPublished: true,
        publishedAt: existing?.publishedAt ?? now,
      },
    })

    console.log(`Publicada ${published.slug} para temporada ${season.id}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

Añade el script npm en `package.json` sin reordenar el resto.

- [ ] **Step 2: Dry-check TypeScript of the new files**

Run: `npx vitest run tests/lib/kelme-cup-mobile-edition.test.ts`

Expected: PASS. El script no se ejecuta todavía contra prod en este task.

- [ ] **Step 3: Run against local DB only if the cup season already exists**

Run: `npm run db:publish:kelme-cup-mobile`

Expected:

- Si no hay temporada: exit 1 con el mensaje de seed. Entonces corre `npm run db:seed:copa-kelme-los-lagos` (PowerShell: `npm run db:seed:copa-kelme-los-lagos -- --variant=4 --phase=grupos --start=2026-10-25`) y reintenta el publish. No inventes otra season.
- Si hay temporada + equipos: imprime `Publicada kelme-cup-los-lagos-2026`.
- No toques la config de Invierno (`liga-invierno-kelme-puerto-varas-2026`).

- [ ] **Step 4: Commit**

```bash
git add scripts/publish-kelme-cup-mobile-edition.ts package.json
git commit -m "feat: publish Kelme Cup mobile edition from existing cup season"
```

---

### Task 3: Carpeta Expo + assets Cup

**Files:**
- Create: `apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts`
- Create: `apps/mobile/editions/kelme-cup-los-lagos-2026/assets/icon.png`
- Create: `apps/mobile/editions/kelme-cup-los-lagos-2026/assets/splash.png`
- Create: `apps/mobile/editions/kelme-cup-los-lagos-2026/assets/adaptive-icon.png`
- Create: `scripts/generate-kelme-cup-mobile-assets.mjs`
- Create: `tests/lib/kelme-cup-mobile-edition-files.test.ts`
- Modify: `apps/mobile/src/lib/edition.ts`

**Interfaces:**
- Consumes: `kelmeCupMobileScaffoldConfig('copa-kelme-los-lagos')`, `applyMobileEditionScaffold`, `editionIndexPatch` from `src/lib/mobile-edition-scaffold.ts`; escudo `public/branding/kelme-cup-shield.png`
- Produces: edición registrada como `kelmeCupLosLagos2026`; Invierno sigue en `EDITIONS`; assets 1024×1024 solo en la carpeta Cup.

- [ ] **Step 1: Write the failing file test**

```ts
// tests/lib/kelme-cup-mobile-edition-files.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KELME_CUP_MOBILE_API_BASE_URL,
  KELME_CUP_MOBILE_BUNDLE_ID,
  KELME_CUP_MOBILE_SLUG,
} from '@/lib/kelme-cup-mobile-edition'
import { KELME_CUP_PRIMARY } from '@/lib/org-brand'

const repoRoot = process.cwd()

describe('kelme cup expo edition files', () => {
  it('registers the cup edition without rewriting invierno', () => {
    const editionIndex = readFileSync(
      path.join(repoRoot, 'apps/mobile/src/lib/edition.ts'),
      'utf8',
    )
    const cupConfig = readFileSync(
      path.join(repoRoot, 'apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts'),
      'utf8',
    )
    const inviernoConfig = readFileSync(
      path.join(
        repoRoot,
        'apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/edition.config.ts',
      ),
      'utf8',
    )

    expect(editionIndex).toContain(
      "import kelmeCupLosLagos2026 from '../../editions/kelme-cup-los-lagos-2026/edition.config'",
    )
    expect(editionIndex).toContain('[kelmeCupLosLagos2026.key]: kelmeCupLosLagos2026')
    expect(editionIndex).toContain(
      "import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'",
    )
    expect(cupConfig).toContain(`slug: '${KELME_CUP_MOBILE_SLUG}'`)
    expect(cupConfig).toContain(KELME_CUP_MOBILE_BUNDLE_ID)
    expect(cupConfig).toContain(KELME_CUP_MOBILE_API_BASE_URL)
    expect(cupConfig).toContain(KELME_CUP_PRIMARY)
    expect(cupConfig).not.toContain('#CD212A')
    expect(inviernoConfig).toContain('cl.kelme.ligainvierno.puertovaras2026')
    expect(inviernoConfig).toContain('#CD212A')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/kelme-cup-mobile-edition-files.test.ts`

Expected: FAIL ENOENT `apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts`

- [ ] **Step 3: Write the Expo files from the exact source below**

No ejecutes `scripts/create-mobile-edition.ts` contra el piloto ni con `--force` sobre Invierno. Si quieres usar el helper, llama `applyMobileEditionScaffold` con `kelmeCupMobileScaffoldConfig('copa-kelme-los-lagos')` y `force: false`; si no, crea los archivos a mano. El `edition.config.ts` debe quedar exactamente así (el `seasonId` del comentario es el token estable del scaffold, no un cuid de prod):

```ts
// seasonId: copa-kelme-los-lagos organizationSlug: kelme
const edition = {
  key: 'kelme-cup-los-lagos-2026',
  slug: 'kelme-cup-los-lagos-2026',
  displayName: 'Kelme Cup Los Lagos 2026',
  shortName: 'Kelme Cup',
  urlScheme: 'kelmecuploslagos2026',
  iosBundleIdentifier: 'cl.admintorneo.kelme.kelmecuploslagos2026',
  androidPackage: 'cl.admintorneo.kelme.kelmecuploslagos2026',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://ligalab.cl',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  primaryColor: '#1A7AE8',
  secondaryColor: '#0B3D8F',
  assetsDir: 'editions/kelme-cup-los-lagos-2026',
} as const

export default edition
```

`apps/mobile/src/lib/edition.ts` queda así (Invierno primero, Cup después; `editionIndexPatch` inserta el import y la entry — no reescribas a mano el resto del archivo si el patch ya lo hizo):

```ts
import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'
import kelmeCupLosLagos2026 from '../../editions/kelme-cup-los-lagos-2026/edition.config'

export type EditionConfig = {
  key: string
  slug: string
  displayName: string
  shortName: string
  urlScheme: string
  iosBundleIdentifier: string
  androidPackage: string
  apiBaseUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  primaryColor: string
  secondaryColor: string
  assetsDir: string
}

const EDITIONS: Record<string, EditionConfig> = {
  [kelmeCupLosLagos2026.key]: kelmeCupLosLagos2026,
  [puertoVaras2026.key]: puertoVaras2026,
}
```

El orden de keys dentro de `EDITIONS` puede ser Cup primero si el patch inserta tras `{`. Ambas keys deben existir. No borres helpers `getEditionConfig` / `resolveEditionKey` / `getActiveEditionConfig`.

- [ ] **Step 4: Replace placeholder assets (do not run `npm run mobile:assets`)**

`npm run mobile:assets` pisa Invierno. Prohibido. Crea `scripts/generate-kelme-cup-mobile-assets.mjs`:

```js
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public', 'branding', 'kelme-cup-shield.png')
const outDir = join(root, 'apps', 'mobile', 'editions', 'kelme-cup-los-lagos-2026', 'assets')

mkdirSync(outDir, { recursive: true })

const image = sharp(source)
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).png().toFile(join(outDir, 'icon.png'))
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).flatten({ background: '#1A7AE8' }).png().toFile(join(outDir, 'splash.png'))
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).png().toFile(join(outDir, 'adaptive-icon.png'))

console.log('Generated Kelme Cup edition assets in', outDir)
```

Run: `node scripts/generate-kelme-cup-mobile-assets.mjs`

Expected: tres PNG nuevos solo bajo `apps/mobile/editions/kelme-cup-los-lagos-2026/assets/`. `git diff -- apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026` vacío.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/kelme-cup-mobile-edition.test.ts tests/lib/kelme-cup-mobile-edition-files.test.ts tests/lib/mobile-edition-scaffold.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/editions/kelme-cup-los-lagos-2026 apps/mobile/src/lib/edition.ts scripts/generate-kelme-cup-mobile-assets.mjs tests/lib/kelme-cup-mobile-edition-files.test.ts
git commit -m "feat: scaffold Kelme Cup Expo edition with flyer assets"
```

---

### Task 4: Publish en el ambiente objetivo + smoke de API

**Files:**
- Modify: `docs/operations/mobile-edition.md` (párrafo de inventario; no cambies el checklist de tiendas)
- Modify: `docs/handoff/SESSION-CONTEXT.md` solo después de publish prod (archivo local, **no** commitear)

**Interfaces:**
- Consumes: script de Task 2; endpoints existentes `GET /api/mobile/v1/leagues/kelme-cup-los-lagos-2026` y `GET /api/mobile/v1/leagues/kelme-cup-los-lagos-2026/home`
- Produces: API 200 en el ambiente publicado; Invierno sigue 200 si ya lo estaba; handoff actualizado.

- [ ] **Step 1: Document the edition in ops**

Al final de `docs/operations/mobile-edition.md` añade (sin reescribir el resto):

```md
## 9. Ediciones en repo

| Slug | Carpeta Expo | Bundle | Notas |
|------|--------------|--------|-------|
| `liga-invierno-kelme-puerto-varas-2026` | `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026` | `cl.kelme.ligainvierno.puertovaras2026` | Piloto. No regenerar. |
| `kelme-cup-los-lagos-2026` | `apps/mobile/editions/kelme-cup-los-lagos-2026` | `cl.admintorneo.kelme.kelmecuploslagos2026` | Kelme Cup. Publicar config: `npm run db:publish:kelme-cup-mobile`. Sin perfil EAS en esta entrega. |
```

- [ ] **Step 2: Publish on the target database**

Local: `npm run db:publish:kelme-cup-mobile` (si Task 2 no lo dejó publicado).

Prod: corre el mismo script con `DATABASE_URL` / `DIRECT_URL` y keys de Supabase **production**, el mismo método que los otros scripts de ops. No imprimas ni commitees secretos. Si la temporada no existe en prod, siembra primero `npm run db:seed:copa-kelme-los-lagos` contra prod (variant 4, `--start=2026-10-25`) y reintenta. No hagas `npx vercel deploy` solo por este cambio: la API ya está en ligalab.cl.

- [ ] **Step 3: Smoke the public API**

```bash
curl -sS -o NUL -w "%{http_code}" https://ligalab.cl/api/mobile/v1/leagues/kelme-cup-los-lagos-2026
curl -sS -o NUL -w "%{http_code}" https://ligalab.cl/api/mobile/v1/leagues/kelme-cup-los-lagos-2026/home
curl -sS -o NUL -w "%{http_code}" https://ligalab.cl/api/mobile/v1/leagues/liga-invierno-kelme-puerto-varas-2026
```

En PowerShell, equivalente:

```powershell
(Invoke-WebRequest -Uri https://ligalab.cl/api/mobile/v1/leagues/kelme-cup-los-lagos-2026 -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri https://ligalab.cl/api/mobile/v1/leagues/kelme-cup-los-lagos-2026/home -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri https://ligalab.cl/api/mobile/v1/leagues/liga-invierno-kelme-puerto-varas-2026 -UseBasicParsing).StatusCode
```

Expected: Cup 200 + JSON con `displayName` `Kelme Cup Los Lagos 2026`. Invierno 200 si ya estaba publicada. Si Cup es 404, el row no quedó `isPublished` en prod — no “arregles” cambiando rutas.

Si solo publicaste local, smoke contra `http://localhost:3000/...` (no levantes un segundo `next dev` si ya hay uno en :3000).

- [ ] **Step 4: Update local handoff after prod publish**

En `docs/handoff/SESSION-CONTEXT.md` (gitignored): anota slug, script, que la API Cup está publicada y que no hubo deploy Vercel ni EAS. No lo incluyas en el commit.

- [ ] **Step 5: Commit ops doc only**

```bash
git add docs/operations/mobile-edition.md
git commit -m "docs: list Kelme Cup mobile edition in ops inventory"
```

---

## Self-review vs spec

| Spec | Task |
|------|------|
| App nueva Cup, no Invierno, no super-app | Tasks 1–3 (bundle/colores distintos; Invierno intacto) |
| Temporada Copa Kelme Los Lagos | Task 2 busca `CUP_SEASON_NAME` |
| Slug / nombres / colores / bundle / scheme / apiBaseUrl | Task 1 + archivo Task 3 |
| Logo escudo en Storage | Task 2 |
| Publish con logo + ≥1 REGISTERED | Task 1 guards + Task 2 |
| Carpeta Expo + registro `edition.ts` | Task 3 |
| Reemplazar placeholders rojos | Task 3 (`generate-kelme-cup-mobile-assets.mjs`, no `mobile:assets`) |
| Verificar GET liga + home; Invierno sigue | Task 4 |
| Fuera: EAS, tiendas, login, amistosos, landing, planteles niños | Ningún task los añade |
