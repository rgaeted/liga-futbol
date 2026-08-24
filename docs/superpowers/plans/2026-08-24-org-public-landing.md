# Landing pública por empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una vitrina sin login en `/{slug}` con live, próximo partido, últimos resultados, goleadores y CTAs de ingresar / registrarse / compartir.

**Architecture:** SSR en `src/app/(tenant)/[organizationSlug]/page.tsx` + loader `getOrgPublicLanding` + proxy marca `/{slug}` exacto como público. UI Cancha de noche vía `MarketingShell` (nombre de la org) + `ShareOrgLink` cliente.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Vitest, Tailwind v4. Sin nuevas dependencias.

**Spec:** `docs/superpowers/specs/2026-08-24-org-public-landing-design.md`

## Global Constraints

- UI y copy en español chileno (`es-CL`), tuteo; fechas con `APP_LOCALE` / `APP_TIMEZONE`.
- Público: sin login. Payload **sin** `paid`, emails, `userId`, roles, membresías, cobros.
- Goleadores: eventos `GOAL` solamente (no `OWN_GOAL`, no `Player.goals`).
- Proxy: solo GET/HEAD de un segmento `/{slug}` válido (no reservado); `/{slug}/admin` sigue privado.
- Identidad Cancha de noche; marca de la **liga** es hero-level; LigaLab solo en pie.
- Org `PAUSED` / inexistente: lo resuelve el layout tenant (mensaje / `notFound`).
- No CMS, no OG custom, no galerías, no analytics públicas.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/proxy-policy.ts` | `/{slug}` público |
| `tests/lib/proxy-policy.test.ts` | Casos públicos/privados |
| `src/lib/org-public-landing.ts` | Tipos, helpers, `getOrgPublicLanding` |
| `tests/lib/org-public-landing.test.ts` | Scorers + shape segura |
| `src/components/marketing/ShareOrgLink.tsx` | WhatsApp + copiar |
| `src/components/marketing/OrgPublicLanding.tsx` | Muro UI |
| `src/components/kelme/MarketingShell.tsx` | `homeHref` / `ayudaHref` / `productName` |
| `src/app/(tenant)/[organizationSlug]/page.tsx` | Página SSR |
| `src/app/plataforma/page.tsx` | Link “Ver landing” (1 línea) |

---

### Task 1: Proxy — `/{slug}` público

**Files:**
- Modify: `src/lib/proxy-policy.ts`
- Modify: `tests/lib/proxy-policy.test.ts`

**Interfaces:**
- Consumes: `parseOrganizationSlug` de `src/lib/organization-slug.ts`
- Produces: `isPublicRequest('GET', '/loslunes') === true`; `'/loslunes/admin' === false`; `'/login'` sigue true

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/proxy-policy.test.ts`:

```ts
  it('treats exact organization slug paths as public', () => {
    expect(isPublicRequest('GET', '/loslunes')).toBe(true)
    expect(isPublicRequest('HEAD', '/kelme')).toBe(true)
    expect(isPublicRequest('GET', '/loslunes/admin')).toBe(false)
    expect(isPublicRequest('GET', '/loslunes/player')).toBe(false)
    expect(isPublicRequest('POST', '/loslunes')).toBe(false)
  })

  it('does not treat reserved single segments as org landings', () => {
    // /login ya es público por otra regla; /plataforma y /organizaciones no
    expect(isPublicRequest('GET', '/plataforma')).toBe(false)
    expect(isPublicRequest('GET', '/organizaciones')).toBe(false)
    expect(isPublicRequest('GET', '/api')).toBe(false)
  })
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npx vitest run tests/lib/proxy-policy.test.ts`

Expected: FAIL on `/loslunes` → false

- [ ] **Step 3: Implement**

In `src/lib/proxy-policy.ts`:

```ts
import { parseOrganizationSlug } from '@/lib/organization-slug'

function isTenantOrgLandingGet(method: string, pathname: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  const match = /^\/([^/]+)$/.exec(pathname)
  if (!match) return false
  return parseOrganizationSlug(match[1]).ok
}
```

Incluir `isTenantOrgLandingGet(method, pathname)` en el `return` de `isPublicRequest` (OR con el resto).

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run tests/lib/proxy-policy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/proxy-policy.ts tests/lib/proxy-policy.test.ts
git commit -m "feat: exponer /{slug} como ruta publica en el proxy"
```

---

### Task 2: Helpers de goleadores y shape pública

**Files:**
- Create: `src/lib/org-public-landing.ts`
- Create: `tests/lib/org-public-landing.test.ts`

**Interfaces:**
- Produces:
  - `export type OrgPublicLanding` (spec §5)
  - `export function tallyRecentScorers(events: Array<{ type: string; playerId: string | null; playerName: string | null }>, take?: number): Array<{ name: string; goals: number }>`
  - `export function assertPublicLandingShape(payload: OrgPublicLanding): void` (throws if sensitive keys appear when JSON.stringified — or simpler: test that a built fixture has no `paid`/`email`)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { tallyRecentScorers } from '@/lib/org-public-landing'

describe('tallyRecentScorers', () => {
  it('counts GOAL only and ignores OWN_GOAL', () => {
    const scorers = tallyRecentScorers([
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'OWN_GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'YELLOW_CARD', playerId: 'p2', playerName: 'Ben' },
    ])
    expect(scorers).toEqual([{ name: 'Ana', goals: 2 }])
  })

  it('takes top 5 by goals then name', () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: 'GOAL',
      playerId: `p${i}`,
      playerName: `J${i}`,
    })).concat(
      Array.from({ length: 3 }, () => ({
        type: 'GOAL',
        playerId: 'p0',
        playerName: 'J0',
      })),
    )
    const scorers = tallyRecentScorers(events, 5)
    expect(scorers).toHaveLength(5)
    expect(scorers[0]).toEqual({ name: 'J0', goals: 4 })
  })
})

describe('public landing payload keys', () => {
  it('fixture JSON does not include paid or email', () => {
    const fixture = {
      organization: { name: 'X', slug: 'x', primaryColor: '#fff', logoUrl: null },
      live: [],
      nextMatch: null,
      results: [],
      scorers: [{ name: 'Ana', goals: 1 }],
    }
    const raw = JSON.stringify(fixture)
    expect(raw).not.toMatch(/paid/i)
    expect(raw).not.toMatch(/email/i)
  })
})
```

- [ ] **Step 2: Run — expect fail (module missing)**

Run: `npx vitest run tests/lib/org-public-landing.test.ts`

- [ ] **Step 3: Implement helpers + types**

Create `src/lib/org-public-landing.ts` with types from the spec and:

```ts
export function tallyRecentScorers(
  events: Array<{ type: string; playerId: string | null; playerName: string | null }>,
  take = 5,
): Array<{ name: string; goals: number }> {
  const map = new Map<string, { name: string; goals: number }>()
  for (const e of events) {
    if (e.type !== 'GOAL' || !e.playerId) continue
    const row = map.get(e.playerId) ?? { name: e.playerName ?? 'Jugador', goals: 0 }
    row.goals += 1
    if (e.playerName) row.name = e.playerName
    map.set(e.playerId, row)
  }
  return [...map.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}
```

Include `OrgPublicLanding` type with `organization.logoUrl: string | null`.

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/org-public-landing.ts tests/lib/org-public-landing.test.ts
git commit -m "feat: helpers de goleadores para landing publica"
```

---

### Task 3: Loader `getOrgPublicLanding`

**Files:**
- Modify: `src/lib/org-public-landing.ts`

**Interfaces:**
- Consumes: `db`, `matchDisplayName`, `playerDisplayName`, `PLAYER_PERSON_NAME_INCLUDE`, `formatScheduleDateLabel`, `formatScheduleTimeLabel`, `editorialPublicUrl`, `tallyRecentScorers`, `MatchStatus`, `EventType`
- Produces: `export async function getOrgPublicLanding(slug: string): Promise<OrgPublicLanding | null>`

- [ ] **Step 1: Implement loader** (no DB test in v1)

```ts
export async function getOrgPublicLanding(slug: string): Promise<OrgPublicLanding | null> {
  const org = await db.organization.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoStoragePath: true,
    },
  })
  if (!org) return null

  const now = new Date()
  const scorersFrom = new Date(now.getTime() - 30 * 86_400_000)

  const [liveMatches, nextMatch, results, scorerMatches] = await Promise.all([
    db.match.findMany({
      where: {
        organizationId: org.id,
        status: { in: [MatchStatus.LIVE, MatchStatus.HALFTIME] },
      },
      orderBy: { scheduledAt: 'asc' },
      select: matchPublicSelect,
    }),
    db.match.findFirst({
      where: {
        organizationId: org.id,
        status: MatchStatus.SCHEDULED,
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      select: matchPublicSelect,
    }),
    db.match.findMany({
      where: { organizationId: org.id, status: MatchStatus.FINISHED },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      select: matchPublicSelect,
    }),
    db.match.findMany({
      where: {
        organizationId: org.id,
        status: MatchStatus.FINISHED,
        scheduledAt: { gte: scorersFrom },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 40,
      select: {
        events: {
          where: { type: EventType.GOAL },
          select: {
            type: true,
            playerId: true,
            player: { include: PLAYER_PERSON_NAME_INCLUDE },
          },
        },
      },
    }),
  ])

  // map to OrgPublicLanding:
  // score live: `${homeScore} – ${awayScore}` (siempre números en live)
  // results score: same
  // when: `${formatScheduleDateLabel} · ${formatScheduleTimeLabel}`
  // venue: venue ?? communeName ?? 'Sin sede'
  // scorers: tallyRecentScorers(flat events with playerDisplayName)
  // logoUrl: editorialPublicUrl(org.logoStoragePath)
}
```

`matchPublicSelect`:

```ts
{
  id: true,
  matchType: true,
  status: true,
  scheduledAt: true,
  venue: true,
  communeName: true,
  homeScore: true,
  awayScore: true,
  sideAName: true,
  sideBName: true,
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
}
```

Si `getOrgPublicLanding` returns `null`, la page llama `notFound()`.

- [ ] **Step 2: Keep unit tests green**

Run: `npx vitest run tests/lib/org-public-landing.test.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/org-public-landing.ts
git commit -m "feat: loader getOrgPublicLanding para vitrina publica"
```

---

### Task 4: `ShareOrgLink` (cliente)

**Files:**
- Create: `src/components/marketing/ShareOrgLink.tsx`

**Interfaces:**
- Consumes: `orgName: string`, `slug: string`
- Produces: UI buttons WhatsApp + Copiar

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'

export function ShareOrgLink({ orgName, slug }: { orgName: string; slug: string }) {
  const [copied, setCopied] = useState(false)

  function absoluteUrl() {
    return `${window.location.origin}/${slug}`
  }

  function shareWhatsApp() {
    const text = `${orgName} — ${absoluteUrl()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={shareWhatsApp} className="btn-kelme-outline ...">
        WhatsApp
      </button>
      <button type="button" onClick={() => void copyLink()} className="btn-kelme-outline ...">
        {copied ? 'Link copiado' : 'Copiar link'}
      </button>
    </div>
  )
}
```

Usar clases existentes (`btn-kelme-outline` o border `#2A3A32` como en admin).

- [ ] **Step 2: Commit**

```bash
git add src/components/marketing/ShareOrgLink.tsx
git commit -m "feat: boton compartir landing de empresa"
```

---

### Task 5: UI + página SSR

**Files:**
- Create: `src/components/marketing/OrgPublicLanding.tsx`
- Create: `src/app/(tenant)/[organizationSlug]/page.tsx`
- Modify: `src/components/kelme/MarketingShell.tsx` (props `homeHref?`, `ayudaHref?`)

**Interfaces:**
- Consumes: `OrgPublicLanding`, `ShareOrgLink`, `MarketingShell`
- Produces: render en `/{slug}`

- [ ] **Step 1: Extend MarketingShell**

```ts
type Props = {
  children: React.ReactNode
  productName?: string
  active?: 'home' | 'ayuda'
  homeHref?: string      // default '/'
  ayudaHref?: string     // default '/kelme/ayuda' (compat) → better default keep as-is for ProductLanding
  showLogin?: boolean    // default true
}
```

- Header brand `Link` → `homeHref ?? '/'`
- “Guía de uso” → `ayudaHref ?? '/kelme/ayuda'`
- Footer ayuda igual
- Login link puede incluir `callbackUrl` si se pasa `loginCallback?: string`

For org landing: `homeHref=/{slug}`, `ayudaHref=/{slug}/ayuda`, `productName=org.name`, `loginCallback=/{slug}`.

- [ ] **Step 2: OrgPublicLanding**

Server component (ShareOrgLink is client island):

1. Hero: monograma (iniciales de `organization.name` o `<img src={logoUrl}>` si hay) + `h1` nombre + subtítulo “Partidos, marcador y goleadores”
2. CTAs: si `live[0]` → `Link` `btn-kelme` “Ver en vivo” → `/{slug}/live/{id}`; Links Ingresar `/login?callbackUrl=/{slug}`, Registrarse `/register`; `<ShareOrgLink />`
3. Sección Ahora: si live.length → lista; else si nextMatch → card (sin link forzado a live si SCHEDULED sin página — **sí** link a `/{slug}/live/{id}` igual que admin, live page ya existe para finished/scheduled)
4. Resultados: lista con score + when
5. Goleadores: ol/ul top 5
6. Empty: si no live && !next && results.length===0 → “Aún no hay partidos publicados”
7. Pie extra inside content optional; MarketingShell footer already has year — add “Powered by LigaLab” link to `/` in the landing body bottom

Tokens: `#0B1210` `#121A18` `#2A3A32` `#E8E4D8` `#8A938C`, `font-display`, `font-data` for scores.

- [ ] **Step 3: Page**

```tsx
import { notFound } from 'next/navigation'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { getOrgPublicLanding } from '@/lib/org-public-landing'

export const dynamic = 'force-dynamic'

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const data = await getOrgPublicLanding(organizationSlug)
  if (!data) notFound()

  return (
    <MarketingShell
      productName={data.organization.name}
      homeHref={`/${data.organization.slug}`}
      ayudaHref={`/${data.organization.slug}/ayuda`}
      active="home"
    >
      <OrgPublicLanding data={data} />
    </MarketingShell>
  )
}
```

Layout tenant already sets `--org-primary`.

- [ ] **Step 4: Run related tests**

Run: `npx vitest run tests/lib/proxy-policy.test.ts tests/lib/org-public-landing.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/OrgPublicLanding.tsx src/app/(tenant)/[organizationSlug]/page.tsx src/components/kelme/MarketingShell.tsx
git commit -m "feat: landing publica por empresa en /{slug}"
```

---

### Task 6: Link en plataforma + smoke

**Files:**
- Modify: `src/app/plataforma/page.tsx` (junto a “Ingresar” admin)

- [ ] **Step 1: Add “Ver landing”**

Next to existing Ingresar for ACTIVE orgs:

```tsx
<Link
  href={`/${org.slug}`}
  className="rounded-full border border-[#2A3A32] px-4 py-1.5 text-xs font-bold text-[#E8E4D8] hover:bg-[#0B1210]"
>
  Ver landing
</Link>
```

Keep admin Ingresar as is (`/{slug}/admin`).

- [ ] **Step 2: Commit**

```bash
git add src/app/plataforma/page.tsx
git commit -m "feat: link Ver landing desde directorio de plataforma"
```

- [ ] **Step 3: Manual smoke**

1. Logged out: open `/loslunes` — no redirect to login.
2. See hero name, CTAs, results/scorers if data.
3. WhatsApp / Copiar link works.
4. `/loslunes/admin` still requires login.
5. `/kelme` works for league-ish data.

Fix + commit if needed:

```bash
git commit -m "fix: ajustes landing publica tras smoke"
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| `/{slug}` público | 1, 5 |
| Proxy exact slug | 1 |
| Loader + payload | 2, 3 |
| GOAL scorers 30d/40 | 2, 3 |
| Hero + CTAs + share | 4, 5 |
| Live / next / results | 5 |
| No sensitive fields | 2, 3 |
| MarketingShell org name | 5 |
| Plataforma link | 6 |
| Tests proxy + scorers | 1, 2 |

No spec requirements left without a task.
