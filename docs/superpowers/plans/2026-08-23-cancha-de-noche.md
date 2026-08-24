# Cancha de noche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la identidad “Cancha de noche” a toda la web LigaLab (tokens, shells y 4 superficies clave) sin cambiar flujos, APIs ni la app Expo.

**Architecture:** Primero un helper de contraste para el acento de org; después tokens + utilidades en `globals.css` para que forms/tablas hereden; luego se redibujan shells y las 4 pantallas del segundo pase (login, landing, live, dashboard admin). `--org-primary` ya lo inyecta `src/app/(tenant)/[organizationSlug]/layout.tsx`.

**Tech Stack:** Next.js 16 App Router · Tailwind v4 (`@theme inline`) · next/font/google · Vitest · español chileno (`es-CL`)

**Spec:** `docs/superpowers/specs/2026-08-23-cancha-de-noche-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/org-accent.ts` | Contraste flood/night sobre el color de org |
| `tests/lib/org-accent.test.ts` | Tests del helper |
| `src/lib/fonts.ts` | Oswald, Manrope, IBM Plex Mono |
| `src/app/layout.tsx` | Variables de fuente + themeColor noche |
| `src/app/globals.css` | Tokens noche y utilidades `.btn-kelme` etc. |
| `src/components/dashboard/DashboardAppShell.tsx` | Shell de todos los paneles |
| `src/components/plataforma/PlatformShell.tsx` | Acciones top en noche |
| `src/components/kelme/MarketingShell.tsx` | Header/footer público |
| `src/app/(auth)/login/page.tsx` | Login |
| `src/app/(auth)/register/RegisterForm.tsx` | Registro |
| `src/app/organizaciones/page.tsx` | Picker multi-org |
| `src/components/plataforma/OrganizationPicker.tsx` | Lista de ligas |
| `src/components/marketing/ProductLanding.tsx` | Landing |
| `src/components/live/LiveScoreboard.tsx` | Live: fondo + marcador |
| `src/components/live/LiveMatchContextBar.tsx` | Barra de reflector live |
| `src/components/admin/AdminDashboardHome.tsx` | Tablero admin |
| `src/components/admin/AdminDashboardPanels.tsx` | Cards del tablero |
| `src/components/admin/AdminDashboardSkeleton.tsx` | Skeleton noche |
| `src/components/admin/AdminSeasonSelect.tsx` | Select noche |

`DashboardShell` no se reescribe: ya usa `DashboardAppShell`.

---

### Task 1: Contraste del acento de org

**Files:**
- Create: `src/lib/org-accent.ts`
- Test: `tests/lib/org-accent.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { orgAccentForeground } from '@/lib/org-accent'

describe('orgAccentForeground', () => {
  it('uses night text on a light accent', () => {
    expect(orgAccentForeground('#E8E4D8')).toBe('#0B1210')
  })

  it('uses flood text on Kelme red', () => {
    expect(orgAccentForeground('#C91F26')).toBe('#E8E4D8')
  })

  it('uses flood text when the hex is invalid', () => {
    expect(orgAccentForeground('red')).toBe('#E8E4D8')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/org-accent.test.ts`

Expected: FAIL — cannot find module `@/lib/org-accent`

- [ ] **Step 3: Write minimal implementation**

```ts
const NIGHT = '#0B1210'
const FLOOD = '#E8E4D8'

export function orgAccentForeground(hex: string): typeof NIGHT | typeof FLOOD {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim())
  if (!match) return FLOOD
  const value = match[1]
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? NIGHT : FLOOD
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run tests/lib/org-accent.test.ts`

Expected: PASS 3 tests

- [ ] **Step 5: Commit**

```bash
git add tests/lib/org-accent.test.ts src/lib/org-accent.ts
git commit -m "feat: contraste flood/night para el acento de cada liga"
```

---

### Task 2: Fuentes Oswald / Manrope / Plex Mono

**Files:**
- Modify: `src/lib/fonts.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/lib/fonts.ts`**

```ts
import { IBM_Plex_Mono, Manrope, Oswald } from 'next/font/google'

export const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

export const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})
```

- [ ] **Step 2: Update root layout imports and html class**

In `src/app/layout.tsx`:

- Import `{ oswald, manrope, ibmPlexMono }` from `@/lib/fonts` (remove montserrat/poppins/roboto).
- `themeColor: '#0B1210'`
- `html` className: `` `${oswald.variable} ${manrope.variable} ${ibmPlexMono.variable} h-full antialiased` ``

- [ ] **Step 3: Grep leftover font imports**

Run: `rg -n "montserrat|poppins|roboto|--font-montserrat" src --glob "!**/*.css"`

Expected: no matches in `src/` except maybe comments. Fix any leftover TS imports.

- [ ] **Step 4: Commit**

```bash
git add src/lib/fonts.ts src/app/layout.tsx
git commit -m "feat: tipografia Oswald Manrope y Plex Mono"
```

---

### Task 3: Tokens noche y utilidades

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `:root` and `@theme inline`**

Use these exact tokens (spec):

```css
@import "tailwindcss";

:root {
  --night: #0B1210;
  --turf: #121A18;
  --line: #2A3A32;
  --flood: #E8E4D8;
  --mist: #8A938C;
  --ember: #C91F26;
  --org-primary: var(--ember);
  --org-secondary: var(--flood);
  --kelme-red: var(--org-primary);
  --kelme-red-dark: #9A181E;
  --kelme-red-bright: var(--org-primary);
  --kelme-green: #3D8B6E;
  --kelme-black: var(--night);
  --kelme-white: var(--flood);
  --gray-900: var(--flood);
  --gray-600: var(--mist);
  --gray-400: var(--mist);
  --gray-100: var(--turf);
  --border: var(--line);
  --background: var(--night);
  --foreground: var(--flood);
  --surface: var(--turf);
}

@theme inline {
  --color-kelme-red: var(--org-primary);
  --color-kelme-red-dark: #9A181E;
  --color-kelme-red-bright: var(--org-primary);
  --color-kelme-green: #3D8B6E;
  --color-kelme-black: var(--night);
  --color-kelme-white: var(--flood);
  --color-kelme-gray-900: var(--flood);
  --color-kelme-gray-600: var(--mist);
  --color-kelme-gray-400: var(--mist);
  --color-kelme-gray-100: var(--turf);
  --color-kelme-border: var(--line);
  --color-kelme-surface: var(--turf);
  --color-kelme-bg: var(--night);
  --color-kelme-live-bg: var(--night);
  --color-kelme-live-surface: var(--turf);
  --font-display: var(--font-oswald);
  --font-ui: var(--font-manrope);
  --font-body: var(--font-manrope);
  --font-data: var(--font-ibm-plex-mono);
}
```

- [ ] **Step 2: Rewrite body, type classes, and utilities**

```css
body {
  background: var(--night);
  color: var(--flood);
  font-family: var(--font-manrope), Manrope, sans-serif;
}

.font-display {
  font-family: var(--font-oswald), Oswald, sans-serif;
}

.font-ui {
  font-family: var(--font-manrope), Manrope, sans-serif;
}

.font-data {
  font-family: var(--font-ibm-plex-mono), "IBM Plex Mono", monospace;
}

.btn-kelme {
  @apply rounded-xl bg-org-primary px-4 py-3 font-ui text-sm font-extrabold text-[#E8E4D8] shadow-none transition hover:brightness-110 disabled:opacity-50;
}

.btn-kelme-outline {
  @apply rounded-xl border border-kelme-border bg-transparent px-4 py-3 font-ui text-sm font-bold text-[#E8E4D8] transition hover:bg-[#121A18] disabled:opacity-50;
}

.input-kelme {
  @apply w-full rounded-xl border border-kelme-border bg-[#0B1210] px-3.5 py-3 text-sm font-semibold text-[#E8E4D8] outline-none placeholder:font-normal placeholder:text-[#8A938C] focus:border-[color:var(--org-primary)] focus:ring-2 focus:ring-[color:var(--org-primary)]/25;
}

.card-kelme {
  @apply rounded-[18px] border border-kelme-border bg-kelme-surface;
}

.table-kelme thead {
  @apply bg-kelme-surface text-kelme-gray-600;
}

.table-kelme th,
.table-kelme td {
  @apply border-t border-kelme-border p-3;
}

.link-nav {
  @apply font-ui text-sm font-medium text-kelme-gray-600 transition-colors hover:text-org-primary;
}

.link-nav-active {
  @apply font-ui text-sm font-semibold text-[#E8E4D8] underline decoration-2 decoration-[color:var(--org-primary)] underline-offset-4;
}

@keyframes kelme-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.live-pulse {
  animation: kelme-pulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .live-pulse {
    animation: none;
  }
  .btn-kelme,
  .btn-kelme-outline,
  .input-kelme {
    transition: none;
  }
}

.bg-org-primary {
  background-color: var(--org-primary);
}

.text-org-primary {
  color: var(--org-primary);
}
```

Keep existing `.bg-org-primary` / `.text-org-primary` at the end of the file.

- [ ] **Step 3: Confirm CSS has no leftover cream page defaults**

Run: `rg -n "#f5f5f7|#17171a|#FFFFFF" src/app/globals.css`

Expected: no `#f5f5f7` / `#17171a` as page background. `#E8E4D8` / `#0B1210` only.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: tokens Cancha de noche y utilidades heredadas"
```

---

### Task 4: DashboardAppShell noche

**Files:**
- Modify: `src/components/dashboard/DashboardAppShell.tsx`

- [ ] **Step 1: Restyle the shell chrome**

Replace hardcoded light hexes with night tokens. Exact class swaps:

- Outer: `min-h-screen bg-[#0B1210] text-[#E8E4D8] lg:grid lg:grid-cols-[235px_1fr] lg:grid-rows-[76px_1fr]`
- Header: `sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#2A3A32] bg-[#121A18] px-4 lg:col-span-2 lg:px-7` plus a 2px ember bar: add `relative` and a child

```tsx
<div
  aria-hidden
  className="absolute inset-x-0 bottom-0 h-[2px] bg-org-primary"
/>
```

as the first child inside `<header>`.

- Brand title (`<b>`): `text-[#E8E4D8]`
- Brand subtitle (`<small>`): `text-[#8A938C]`
- Avatar: `bg-org-primary text-[#E8E4D8]` (not `#c91f26` / `text-white`)
- User name: `text-[#E8E4D8]`; role + Salir: `text-[#8A938C]`; Salir hover: `hover:bg-[#0B1210] hover:text-[#E8E4D8]`
- Divider: `border-[#2A3A32]`
- Overlay: `bg-black/50`
- Aside: `border-[#2A3A32] bg-[#121A18] shadow-none`
- Group label: `text-[#8A938C]`
- Nav active: `bg-[#0B1210] text-[#E8E4D8]` (not `#fff0f1` / `#c91f26`)
- Nav idle: `text-[#8A938C] hover:bg-[#0B1210]`
- Icon box active: `bg-[#121A18] text-org-primary`; idle: `bg-[#0B1210] text-[#8A938C]`
- Count chip: `bg-[#0B1210] text-[#8A938C]`

Do not change props or nav logic.

- [ ] **Step 2: Visual check list (manual)**

Open `/kelme/admin` and `/plataforma`. Expected: dark chrome, 2px ember bar under header, active nav uses org color only on the icon tile.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardAppShell.tsx
git commit -m "feat: shell de paneles en Cancha de noche"
```

---

### Task 5: MarketingShell y PlatformShell

**Files:**
- Modify: `src/components/kelme/MarketingShell.tsx`
- Modify: `src/components/plataforma/PlatformShell.tsx`

- [ ] **Step 1: MarketingShell**

- Outer: `flex min-h-screen flex-col bg-[#0B1210] text-[#E8E4D8]`
- Header: `sticky top-0 z-20 border-b border-[#2A3A32] bg-[#121A18] relative` + same 2px `bg-org-primary` bar
- Mark “LL”: `bg-org-primary text-[#E8E4D8]`
- Product name: `text-[#E8E4D8]`
- Eyebrow: `text-[#8A938C]`
- Guía de uso: `border-[#2A3A32] bg-transparent text-[#8A938C] hover:bg-[#0B1210]`; active `text-org-primary`
- Footer (if present): `border-[#2A3A32] text-[#8A938C]`; links `text-[#E8E4D8]`

- [ ] **Step 2: PlatformShell top action**

Replace the “Mis ligas” link classes with:

`hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex`

- [ ] **Step 3: DashboardShell help link**

In `src/components/kelme/DashboardShell.tsx`, if the help link still uses `border-[#dddde2] bg-white text-[#5f5f66] hover:bg-[#f7f7f9]`, swap to the same night outline as PlatformShell.

- [ ] **Step 4: Commit**

```bash
git add src/components/kelme/MarketingShell.tsx src/components/plataforma/PlatformShell.tsx src/components/kelme/DashboardShell.tsx
git commit -m "feat: marketing y plataforma en Cancha de noche"
```

---

### Task 6: Login, registro y organizaciones

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/RegisterForm.tsx`
- Modify: `src/app/organizaciones/page.tsx`
- Modify: `src/components/plataforma/OrganizationPicker.tsx`

- [ ] **Step 1: Login page**

- `main`: `flex min-h-screen items-center justify-center bg-[#0B1210] px-4`
- Mark LL: `bg-org-primary text-[#E8E4D8]`
- LIGALAB: `text-[#E8E4D8]`
- GESTIÓN DEPORTIVA: `text-[#8A938C]`
- Form already uses `card-kelme` / `input-kelme` / `btn-kelme` — change remaining hex:
  - h1 `text-[#E8E4D8]`
  - subtitle `text-[#8A938C]`
  - error can stay `text-org-primary` or `text-[#C91F26]`
  - register link `text-org-primary`

- [ ] **Step 2: RegisterForm**

Same night `main` + card treatment as login. Replace `bg-[#f5f5f7]`, `text-[#17171a]`, white cards, and light inputs with `card-kelme`, `input-kelme`, `btn-kelme`, `text-[#E8E4D8]`, `text-[#8A938C]`. Keep claim logic untouched.

- [ ] **Step 3: Organizaciones + picker**

`organizaciones/page.tsx` main: `bg-[#0B1210]`, titles `text-[#E8E4D8]`, body `text-[#8A938C]`, mark `bg-org-primary`.

In `OrganizationPicker.tsx` replace the white list (`bg-white`, `border-[#e5e5e9]`, `text-[#17171a]`) with `border-[#2A3A32] bg-[#121A18]`, name `text-[#E8E4D8]`, meta `text-[#8A938C]`, hover `hover:bg-[#0B1210]`, chip Ingresar `bg-[#0B1210] text-org-primary`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/RegisterForm.tsx" src/app/organizaciones/page.tsx src/components/plataforma/OrganizationPicker.tsx
git commit -m "feat: auth y picker de ligas en Cancha de noche"
```

---

### Task 7: Landing

**Files:**
- Modify: `src/components/marketing/ProductLanding.tsx`

- [ ] **Step 1: Rewrite hero copy and classes**

Replace the white hero. Keep FEATURES structure. New hero copy (es-CL, tesis de partido, no “gestiona tu liga”):

```tsx
<section className="border-b border-[#2A3A32] bg-[#0B1210]">
  <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
    <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
      Marcador · plantel · temporada
    </p>
    <h1 className="font-display mt-3 max-w-2xl text-[clamp(2.5rem,5vw,3.75rem)] font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
      El partido se ve de noche
    </h1>
    <p className="mt-4 max-w-xl text-lg text-[#8A938C]">
      LigaLab opera ligas con plantel, fixture y live. Una temporada, varias categorías, un solo club.
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href="/login" className="btn-kelme">Ingresar</Link>
      <Link href="/kelme/ayuda" className="btn-kelme-outline">Guía de uso</Link>
    </div>
  </div>
</section>
```

Feature section: `h2` `text-[#E8E4D8]`; cards already `card-kelme`; titles `text-[#E8E4D8]`; descriptions `text-[#8A938C]`.

- [ ] **Step 2: Commit**

```bash
git add src/components/marketing/ProductLanding.tsx
git commit -m "feat: landing Cancha de noche"
```

---

### Task 8: Live (segundo pase)

**Files:**
- Modify: `src/components/live/LiveScoreboard.tsx`
- Modify: `src/components/live/LiveMatchContextBar.tsx`

- [ ] **Step 1: LiveScoreboard frame**

- Outer: `min-h-screen bg-[#0B1210] text-[#E8E4D8]` (replaces `bg-kelme-live-bg text-white` if still present)
- Organization name fallback: `font-display ... text-[#E8E4D8]`
- Live label stays `text-org-primary` + `live-pulse`
- Score digits: add `font-data` (IBM Plex Mono) wherever the home/away numbers render. Do not change snapshot logic.

- [ ] **Step 2: Context bar reflector**

In `LiveMatchContextBar.tsx`, keep icons. Add a 2px `bg-org-primary` bar at the top or bottom of the bar container. Swap leftover `text-white/55` labels to `text-[#8A938C]` and titles to `text-[#E8E4D8]` / `font-display` for team names if they are currently generic white.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/LiveScoreboard.tsx src/components/live/LiveMatchContextBar.tsx
git commit -m "feat: live con marcador tribuna y barra de reflector"
```

---

### Task 9: Dashboard admin (segundo pase)

**Files:**
- Modify: `src/components/admin/AdminDashboardHome.tsx`
- Modify: `src/components/admin/AdminDashboardPanels.tsx`
- Modify: `src/components/admin/AdminDashboardSkeleton.tsx`
- Modify: `src/components/admin/AdminSeasonSelect.tsx`

- [ ] **Step 1: Home header**

Replace zinc/light classes:

- Eyebrow: `text-[#8A938C]`
- Active chip: `bg-[#0B1210] text-[#3D8B6E]` (not emerald-50)
- Title: `font-display text-4xl font-semibold uppercase tracking-wide text-[#E8E4D8]`
- Subtitle: `text-[#8A938C]`
- Export: night outline (`border-[#2A3A32] bg-transparent text-[#E8E4D8] hover:bg-[#121A18]`)
- Programar partido: `btn-kelme` or `bg-org-primary text-[#E8E4D8]`
- KPI cards: `border-[#2A3A32] bg-[#121A18]`; labels `text-[#8A938C]`; values `font-data text-[#E8E4D8]`; bar track `bg-[#0B1210]`; bar fill `bg-org-primary`

- [ ] **Step 2: Panels + skeleton + season select**

`AdminDashboardPanels.tsx`: every `bg-white`, `border-[#e5e5e9]`, `text-zinc-900` → `bg-[#121A18]`, `border-[#2A3A32]`, `text-[#E8E4D8]`; muted → `text-[#8A938C]`; rank accent can stay org-primary.

`AdminDashboardSkeleton.tsx`: pulse blocks `bg-[#121A18] border-[#2A3A32]` (not zinc-200 / white).

`AdminSeasonSelect.tsx`: `h-[42px] rounded-[10px] border border-[#2A3A32] bg-[#0B1210] px-3 font-ui text-sm font-semibold text-[#E8E4D8]`

Do not change data props.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminDashboardHome.tsx src/components/admin/AdminDashboardPanels.tsx src/components/admin/AdminDashboardSkeleton.tsx src/components/admin/AdminSeasonSelect.tsx
git commit -m "feat: tablero admin en Cancha de noche"
```

---

### Task 10: Cierre — paused tenant, ayuda, grep de shells

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/layout.tsx` (paused state only)
- Modify: help page wrapper only if it hardcodes light page chrome (`src/app/(tenant)/[organizationSlug]/ayuda/page.tsx` uses MarketingShell — inherit)

- [ ] **Step 1: Paused org**

In tenant layout paused `<main>`, add `bg-[#0B1210] text-[#E8E4D8]`.

- [ ] **Step 2: Grep leftover light chrome in shells**

Run:

```bash
rg -n "#f5f5f7|#17171a|#fff0f1|bg-white" src/components/dashboard/DashboardAppShell.tsx src/components/kelme/MarketingShell.tsx src/components/plataforma/PlatformShell.tsx src/app/(auth)/login/page.tsx src/components/marketing/ProductLanding.tsx src/components/admin/AdminDashboardHome.tsx
```

Expected: no page-level `#f5f5f7` / `#17171a`. `btn-kelme` may mention flood hex. Fix any leftover chrome.

- [ ] **Step 3: Run unit tests that should still pass**

Run: `npx vitest run tests/lib/org-accent.test.ts tests/lib/team-color.test.ts`

Expected: PASS (team-color tests exist; do not change `contrastTextColor`)

- [ ] **Step 4: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/layout.tsx
git commit -m "fix: estado pausado y chrome claro residual"
```

If `git status` shows no layout change because it was already fine, skip empty commit.

---

## Self-review

| Spec item | Task |
|-----------|------|
| Tokens night/turf/line/flood/mist/ember | 3 |
| Fuentes Oswald/Manrope/Plex | 2 |
| Utilidades btn/input/card/table/nav/live-pulse + reduced motion | 3 |
| Shells admin/DT/jugador/árbitro via DashboardAppShell | 4 |
| Marketing + plataforma | 5 |
| Login / registro / organizaciones | 6 |
| Landing tesis noche | 7 |
| Live marcador + reflector | 8 |
| Dashboard admin segundo pase | 9 |
| `--org-primary` tenant (ya existe) | 0 / 1 helper |
| Expo / wizards / APIs fuera | No tasks |
| Contraste acento claro | 1 |

No placeholders. No “similar to Task N”. Commits after each task.
