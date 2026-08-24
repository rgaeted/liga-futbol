# Formación — posiciones libres en cancha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al DT arrastrar jugadores en la cancha al editar formación, persistir `slotLayout` en `MatchFormation`, y reflejarlo en editor y live.

**Architecture:** JSON `slotLayout` en `MatchFormation`; helpers en `src/lib/formation-slot-layout.ts` resuelven `topPct`/`leftPct` sobre defaults de `formations.ts`; drag en `FormationPitch` + toggle en `FormationEditor`; API formations PUT/GET extendida.

**Tech Stack:** Next.js 16, Prisma 7, Vitest, pointer events nativos (sin deps nuevas).

**Spec:** `docs/superpowers/specs/2026-08-24-formation-slot-layout-design.md`

## Global Constraints

- UI en español chileno (`es-CL`), tuteo.
- GK (`slotKey === 'GK'`) no arrastrable; no persistir en `slotLayout`.
- `topPct` / `leftPct` entre 5 y 95.
- Acierto táctico **no** depende de coordenadas visuales.
- Partido `FINISHED`: formación read-only (comportamiento existente).
- Migración prod: `supabase db query --linked` si Vercel build no corre migrate.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `slotLayout Json?` en `MatchFormation` |
| `prisma/migrations/.../` | ADD COLUMN |
| `src/lib/formation-slot-layout.ts` | Tipos, defaults, merge, validate |
| `tests/lib/formation-slot-layout.test.ts` | Unit tests |
| `src/lib/match-lineup.ts` | `buildLineupView` acepta `slotLayout` |
| `tests/lib/match-lineup.test.ts` | Override positions |
| `src/lib/validations/formation.ts` | Zod `slotLayout` |
| `tests/lib/validations-formation.test.ts` | Validación |
| `src/app/api/matches/[id]/formations/route.ts` | Persist + return layout |
| `src/lib/match-formations.ts` | Pasar `slotLayout` al lineup |
| `src/components/lineup/FormationPitch.tsx` | Drag + posiciones resueltas |
| `src/components/lineup/FormationEditor.tsx` | Toggle, state, save payload |
| `src/components/admin/LeagueLineupEditor.tsx` | initial + PUT body |
| `src/components/admin/FriendlyLineupEditor.tsx` | idem |
| `src/components/coach/CallUpForm.tsx` | idem |
| Páginas lineup que pasan props iniciales | Leer `formation.slotLayout` |

---

### Task 1: Migración + helpers de layout

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260824180000_match_formation_slot_layout/migration.sql`
- Create: `src/lib/formation-slot-layout.ts`
- Create: `tests/lib/formation-slot-layout.test.ts`

**Interfaces:**
- Produces:
  - `export type SlotLayout = Record<string, { topPct: number; leftPct: number }>`
  - `export function defaultSlotPercents(row, col, maxRow, compact): { topPct, leftPct }`
  - `export function mergeSlotLayout(scheme, format, layout?: SlotLayout | null): SlotLayout`
  - `export function validateSlotLayout(scheme, format, layout): { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { defaultSlotPercents, mergeSlotLayout, validateSlotLayout } from '@/lib/formation-slot-layout'

describe('defaultSlotPercents', () => {
  it('maps catalog row/col to percentages', () => {
    const gk = defaultSlotPercents(0, 0.5, 3, false)
    expect(gk.topPct).toBeGreaterThan(80)
    expect(gk.leftPct).toBe(50)
  })
})

describe('mergeSlotLayout', () => {
  it('applies overrides on top of defaults for 4-4-2', () => {
    const merged = mergeSlotLayout('4-4-2', 'FUTBOL_11', {
      CM_L: { topPct: 50, leftPct: 50 },
    })
    expect(merged.CM_L).toEqual({ topPct: 50, leftPct: 50 })
    expect(merged.GK.leftPct).toBe(50)
  })
})

describe('validateSlotLayout', () => {
  it('rejects unknown slot keys', () => {
    const result = validateSlotLayout('4-4-2', 'FUTBOL_11', { FAKE: { topPct: 50, leftPct: 50 } })
    expect(result.ok).toBe(false)
  })

  it('rejects GK override', () => {
    const result = validateSlotLayout('4-4-2', 'FUTBOL_11', { GK: { topPct: 10, leftPct: 10 } })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run tests/lib/formation-slot-layout.test.ts`

- [ ] **Step 3: Schema + migration + implement helpers**

Prisma:
```prisma
model MatchFormation {
  ...
  slotLayout Json?
}
```

Migration SQL:
```sql
ALTER TABLE "MatchFormation" ADD COLUMN "slotLayout" JSONB;
```

Implement `formation-slot-layout.ts` reusing `slotTopPercent` from `formation-layout.ts` for `topPct`.

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/formation-slot-layout.ts tests/lib/formation-slot-layout.test.ts
git commit -m "feat: helpers y migracion slotLayout en MatchFormation"
```

---

### Task 2: buildLineupView + validación API

**Files:**
- Modify: `src/lib/match-lineup.ts`
- Modify: `tests/lib/match-lineup.test.ts`
- Modify: `src/lib/validations/formation.ts`
- Modify: `tests/lib/validations-formation.test.ts`

- [ ] **Step 1: Extend LineupView pitch items**

```ts
pitch: Array<{
  slotKey: string
  label: string
  row: number
  col: number
  topPct: number
  leftPct: number
  ...
}>
```

`buildLineupView({ ..., slotLayout })` → merge via `mergeSlotLayout`.

- [ ] **Step 2: Tests lineup override**

- [ ] **Step 3: Zod schema**

```ts
const slotLayoutEntry = z.object({
  topPct: z.number().min(5).max(95),
  leftPct: z.number().min(5).max(95),
})
slotLayout: z.record(z.string(), slotLayoutEntry).optional()
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/match-lineup.test.ts tests/lib/validations-formation.test.ts tests/lib/formation-slot-layout.test.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: lineup view y validacion para slotLayout"
```

---

### Task 3: API formations persist + GET

**Files:**
- Modify: `src/app/api/matches/[id]/formations/route.ts`
- Modify: `src/lib/match-formations.ts`

- [ ] **Step 1: PUT validates and saves slotLayout**

After scheme validation:
```ts
if (data.slotLayout !== undefined) {
  const check = validateSlotLayout(data.scheme, footballFormat, data.slotLayout)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
}
```

Upsert:
```ts
create: { ..., scheme, slotLayout: data.slotLayout ?? null },
update: { scheme, slotLayout: data.slotLayout ?? null },
```

- [ ] **Step 2: match-formations passes slotLayout to buildLineupView**

Read `formation.slotLayout` from DB row (parse as object).

Extend `FormationSideView`:
```ts
slotLayout: SlotLayout | null
lineup: LineupView | null
```

- [ ] **Step 3: GET returns slotLayout per side** (for editor rehydrate)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: API formations persiste slotLayout"
```

---

### Task 4: FormationPitch drag

**Files:**
- Modify: `src/components/lineup/FormationPitch.tsx`

**Interfaces:**
- New props: `layoutMode?: boolean`, `onSlotLayoutChange?: (slotKey, pos) => void`, `readOnlyLayout?: boolean`
- Use `slot.topPct` / `slot.leftPct` instead of computing from row/col when present on lineup items.

- [ ] **Step 1: Render from topPct/leftPct**

Replace:
```ts
const top = `${slotTopPercent(slot.row, maxRow, variant, compact)}%`
const left = `${slot.col * 100}%`
```
With resolved values from lineup pitch item.

- [ ] **Step 2: Pointer drag (editor, layoutMode, not GK)**

```tsx
onPointerDown → capture, store origin
onPointerMove → convert clientX/Y to % within pitch bounds, clamp 5–95
onPointerUp → release capture, call onSlotLayoutChange
```

Add `touch-action: none` on draggable markers.

- [ ] **Step 3: Disable slot select click when layoutMode** (or use 5px drag threshold)

- [ ] **Step 4: Manual smoke in dev** (optional if no component test infra)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: arrastre de jugadores en cancha de formacion"
```

---

### Task 5: FormationEditor + wire editors

**Files:**
- Modify: `src/components/lineup/FormationEditor.tsx`
- Modify: `src/components/admin/LeagueLineupEditor.tsx`
- Modify: `src/components/admin/FriendlyLineupEditor.tsx`
- Modify: `src/components/coach/CallUpForm.tsx`
- Modify: server pages that load initial formation (grep `LeagueLineupEditor` / `FriendlyLineupEditor` / lineup pages)

- [ ] **Step 1: FormationEditor state**

```ts
initialSlotLayout?: SlotLayout | null
const [slotLayout, setSlotLayout] = useState(initialSlotLayout ?? {})
const [layoutMode, setLayoutMode] = useState(false)
```

Rebuild lineup with `buildLineupView({ ..., slotLayout })`.

Toggle UI + "Restaurar posiciones" → `setSlotLayout({})`.

`onSchemeChange`: `window.confirm(...)` → reset `slotLayout`.

- [ ] **Step 2: onSave payload**

```ts
onSave({ scheme, slots, benchPlayerIds, slotLayout: Object.keys(slotLayout).length ? slotLayout : null })
```

- [ ] **Step 3: Wire PUT in LeagueLineupEditor, FriendlyLineupEditor, CallUpForm**

Pass `initialSlotLayout` from formation side data.

- [ ] **Step 4: Pages — pass initialSlotLayout from server**

Grep lineup pages under `admin/matches/[id]/lineup`, coach callups, friendly lineup.

- [ ] **Step 5: Run related unit tests**

Run: `npx vitest run tests/lib/formation-slot-layout.test.ts tests/lib/match-lineup.test.ts tests/lib/validations-formation.test.ts`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: editor de formacion con modo ajustar posiciones"
```

---

### Task 6: Smoke + migración prod (manual)

- [ ] **Step 1: Local smoke**

1. Admin/coach abre formación `4-4-2`.
2. Activa "Ajustar posiciones", arrastra MC a centro (rombo).
3. Guarda, refresca — posiciones persisten.
4. Live del partido muestra rombo.
5. Cambiar esquema pide confirmación y resetea.
6. GK no se mueve.

- [ ] **Step 2: Migración prod** (cuando el usuario pida deploy)

```bash
supabase db query --linked -f prisma/migrations/20260824180000_match_formation_slot_layout/migration.sql
```

- [ ] **Step 3: Fix commit if needed**

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| slotLayout JSON | 1, 3 |
| GK fijo | 1, 4 |
| Validación 5–95 | 1, 2, 3 |
| buildLineupView merge | 2 |
| API PUT/GET | 3 |
| Drag editor | 4, 5 |
| Live via match-formations | 3 |
| Reset esquema | 5 |
| Wire coach/admin | 5 |
| Tests | 1, 2 |

No spec requirements left without a task.
