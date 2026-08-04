# Friendly Match Roster Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wizard de 2 pasos al crear amistosos (convocatoria → equipos) y mismo UI al editar, con selector A/B por jugador.

**Architecture:** Helpers puros en `friendly-match-roster-ui.ts`; dos componentes UI nuevos (`ConvocationPicker`, `TeamAssigner`); `FriendlyMatchForm` orquesta wizard; `MatchActions` usa los mismos componentes en una sola pantalla. API sin cambios.

**Tech Stack:** Next.js 16, React client components, Vitest, TypeScript, Tailwind (estilos kelme existentes)

**Spec:** `docs/superpowers/specs/2026-08-04-friendly-match-roster-wizard-design.md`

---

## File map

| File | Action |
|------|--------|
| `src/lib/friendly-match-roster-ui.ts` | Create — helpers puros |
| `tests/lib/friendly-match-roster-ui.test.ts` | Create — unit tests |
| `src/components/admin/FriendlyMatchConvocationPicker.tsx` | Create |
| `src/components/admin/FriendlyMatchTeamAssigner.tsx` | Create |
| `src/components/admin/FriendlyMatchForm.tsx` | Modify — wizard |
| `src/components/admin/MatchActions.tsx` | Modify — nuevo UI edit |
| `src/components/admin/FriendlyMatchRosterEditor.tsx` | Delete or slim — reexport desde lib si hace falta transición |

---

### Task 1: Helpers de roster UI

**Files:**
- Create: `src/lib/friendly-match-roster-ui.ts`
- Create: `tests/lib/friendly-match-roster-ui.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/friendly-match-roster-ui.test.ts
import { describe, expect, it } from 'vitest'
import {
  initialSideSplit,
  rosterEntriesFromSets,
  setsFromPlayerSides,
  setPlayerSide,
  toggleConvocation,
} from '@/lib/friendly-match-roster-ui'

const players = [
  { id: 'p1', firstName: 'Ana', lastName: 'Zapata' },
  { id: 'p2', firstName: 'Bruno', lastName: 'Mora' },
  { id: 'p3', firstName: 'Carla', lastName: 'Nunez' },
  { id: 'p4', firstName: 'Diego', lastName: 'Perez' },
]

describe('initialSideSplit', () => {
  it('splits alphabetically half on A and half on B', () => {
    const map = initialSideSplit(players)
    expect(map.get('p1')).toBe('A')
    expect(map.get('p2')).toBe('A')
    expect(map.get('p3')).toBe('B')
    expect(map.get('p4')).toBe('B')
  })
})

describe('setPlayerSide', () => {
  it('moves player and clears captain when leaving side', () => {
    const result = setPlayerSide({
      playerId: 'p1',
      side: 'B',
      sideAIds: new Set(['p1']),
      sideBIds: new Set(['p2']),
      sideACaptainId: 'p1',
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(result.sideAIds.has('p1')).toBe(false)
    expect(result.sideBIds.has('p1')).toBe(true)
    expect(result.sideACaptainId).toBeNull()
  })
})

describe('toggleConvocation', () => {
  it('removes side assignment when unconvoking', () => {
    const result = toggleConvocation({
      playerId: 'p1',
      checked: false,
      convokedIds: new Set(['p1', 'p2']),
      sideAIds: new Set(['p1']),
      sideBIds: new Set(['p2']),
      sideACaptainId: 'p1',
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(result.convokedIds.has('p1')).toBe(false)
    expect(result.sideAIds.has('p1')).toBe(false)
    expect(result.sideACaptainId).toBeNull()
  })
})

describe('rosterEntriesFromSets', () => {
  it('builds API payload with captain and coach flags', () => {
    const entries = rosterEntriesFromSets(
      new Set(['p1']),
      new Set(['p2']),
      'p1',
      'p2',
      'p1',
      'p2'
    )
    expect(entries).toEqual([
      { friendlyPlayerId: 'p1', side: 'A', isCaptain: true, isCoach: true },
      { friendlyPlayerId: 'p2', side: 'B', isCaptain: true, isCoach: true },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/friendly-match-roster-ui.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement helpers**

Create `src/lib/friendly-match-roster-ui.ts` moving and extending logic from `FriendlyMatchRosterEditor.tsx`:

```ts
export type FriendlySide = 'A' | 'B'

export type RosterUiState = {
  convokedIds: Set<string>
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}

export function playerSortKey(p: { firstName: string; lastName: string }) {
  return `${p.lastName} ${p.firstName}`.toLowerCase()
}

export function initialSideSplit(
  players: Array<{ id: string; firstName: string; lastName: string }>
): Map<string, FriendlySide> {
  const sorted = [...players].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b), 'es'))
  const mid = Math.ceil(sorted.length / 2)
  const map = new Map<string, FriendlySide>()
  sorted.forEach((p, i) => map.set(p.id, i < mid ? 'A' : 'B'))
  return map
}

export function mapToSideSets(map: Map<string, FriendlySide>) {
  const sideAIds = new Set<string>()
  const sideBIds = new Set<string>()
  for (const [id, side] of map) {
    if (side === 'A') sideAIds.add(id)
    else sideBIds.add(id)
  }
  return { sideAIds, sideBIds }
}

export function setPlayerSide(input: {
  playerId: string
  side: FriendlySide
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}) {
  const sideAIds = new Set(input.sideAIds)
  const sideBIds = new Set(input.sideBIds)
  let { sideACaptainId, sideBCaptainId, sideACoachId, sideBCoachId } = input

  if (input.side === 'A') {
    sideAIds.add(input.playerId)
    sideBIds.delete(input.playerId)
    if (sideBCaptainId === input.playerId) sideBCaptainId = null
    if (sideBCoachId === input.playerId) sideBCoachId = null
  } else {
    sideBIds.add(input.playerId)
    sideAIds.delete(input.playerId)
    if (sideACaptainId === input.playerId) sideACaptainId = null
    if (sideACoachId === input.playerId) sideACoachId = null
  }

  return { sideAIds, sideBIds, sideACaptainId, sideBCaptainId, sideACoachId, sideBCoachId }
}

export function toggleConvocation(input: {
  playerId: string
  checked: boolean
  convokedIds: Set<string>
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}) {
  const convokedIds = new Set(input.convokedIds)
  let state = {
    sideAIds: new Set(input.sideAIds),
    sideBIds: new Set(input.sideBIds),
    sideACaptainId: input.sideACaptainId,
    sideBCaptainId: input.sideBCaptainId,
    sideACoachId: input.sideACoachId,
    sideBCoachId: input.sideBCoachId,
  }

  if (input.checked) {
    convokedIds.add(input.playerId)
    if (!state.sideAIds.has(input.playerId) && !state.sideBIds.has(input.playerId)) {
      state.sideAIds.add(input.playerId)
    }
  } else {
    convokedIds.delete(input.playerId)
    state.sideAIds.delete(input.playerId)
    state.sideBIds.delete(input.playerId)
    if (state.sideACaptainId === input.playerId) state.sideACaptainId = null
    if (state.sideBCaptainId === input.playerId) state.sideBCaptainId = null
    if (state.sideACoachId === input.playerId) state.sideACoachId = null
    if (state.sideBCoachId === input.playerId) state.sideBCoachId = null
  }

  return { convokedIds, ...state }
}

// Move unchanged from FriendlyMatchRosterEditor:
export function rosterEntriesFromSets(...) { /* existing body */ }
export function setsFromPlayerSides(...) { /* existing body */ }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/friendly-match-roster-ui.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/friendly-match-roster-ui.ts tests/lib/friendly-match-roster-ui.test.ts
git commit -m "feat: add friendly match roster UI helpers"
```

---

### Task 2: FriendlyMatchConvocationPicker

**Files:**
- Create: `src/components/admin/FriendlyMatchConvocationPicker.tsx`

- [ ] **Step 1: Create component**

Props:

```ts
type Props = {
  roster: FriendlyRosterPlayer[]
  convokedIds: Set<string>
  search: string
  onSearchChange: (v: string) => void
  onToggle: (playerId: string, checked: boolean) => void
}
```

UI: fieldset con leyenda "Convocados (N)", input search, lista scroll con checkbox + `FriendlyPlayerAvatar` + nombre (posición). Reutilizar `playerLabel` / filter pattern del editor viejo.

- [ ] **Step 2: Manual smoke** — importar en Story/page temporal o pasar a Task 3 integrado.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/FriendlyMatchConvocationPicker.tsx
git commit -m "feat: add friendly match convocation picker"
```

---

### Task 3: FriendlyMatchTeamAssigner

**Files:**
- Create: `src/components/admin/FriendlyMatchTeamAssigner.tsx`

- [ ] **Step 1: Create component**

Props:

```ts
type Props = {
  convoked: FriendlyRosterPlayer[]
  sideAName?: string
  sideBName?: string
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
  onSideChange: (playerId: string, side: 'A' | 'B') => void
  onSideACaptainChange: ...
  onSideBCaptainChange: ...
  onSideACoachChange: ...
  onSideBCoachChange: ...
}
```

UI:
- Tabla responsive: columnas Jugador | Equipo (dos botones `A` / `B` estilo segmentado; activo = `bg-kelme-red text-white`)
- Debajo: grid 2 cols con selects Capitán y DT por lado (igual lógica que editor viejo, filtrado por `sideAIds` / `sideBIds`)

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/FriendlyMatchTeamAssigner.tsx
git commit -m "feat: add friendly match team assigner"
```

---

### Task 4: Wizard en FriendlyMatchForm

**Files:**
- Modify: `src/components/admin/FriendlyMatchForm.tsx`

- [ ] **Step 1: Add wizard state**

```ts
const [step, setStep] = useState<1 | 2>(1)
const [convokedIds, setConvokedIds] = useState<Set<string>>(new Set())
const [search, setSearch] = useState('')
// keep sideAIds, sideBIds, captains, coaches
```

- [ ] **Step 2: Paso 1 UI**

- Indicador pasos (`1. Convocatoria → 2. Equipos`)
- Campos del partido (excepto submit)
- `FriendlyMatchConvocationPicker`
- Botón **Siguiente**: validar `convokedIds.size >= 2`; al avanzar, para ids convocados sin lado asignado aplicar `initialSideSplit` solo a esos

- [ ] **Step 3: Paso 2 UI**

- `FriendlyMatchTeamAssigner` con `convoked = roster.filter(p => convokedIds.has(p.id))`
- Botones **Volver** / **Crear amistoso**
- Submit usa `rosterEntriesFromSets` importado desde lib

- [ ] **Step 4: Reset on category change**

Limpiar `convokedIds`, sides, captains, coaches, `step = 1`.

- [ ] **Step 5: Run checks**

Run: `npx vitest run tests/lib/friendly-match-roster-ui.test.ts`  
Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/FriendlyMatchForm.tsx
git commit -m "feat: friendly match creation wizard convocation then teams"
```

---

### Task 5: Edición en MatchActions

**Files:**
- Modify: `src/components/admin/MatchActions.tsx`

- [ ] **Step 1: Replace roster state**

```ts
const [convokedIds, setConvokedIds] = useState<Set<string>>(
  () => new Set(match.playerSides.map(p => p.friendlyPlayerId))
)
const [convocationSearch, setConvocationSearch] = useState('')
```

Inicializar `sideAIds`/`sideBIds`/captains desde `setsFromPlayerSides(match.playerSides)`.

- [ ] **Step 2: Replace FriendlyMatchRosterEditor block**

```tsx
<FriendlyMatchConvocationPicker ... />
<FriendlyMatchTeamAssigner convoked={roster.filter(p => convokedIds.has(p.id))} ... />
```

Handlers usan `toggleConvocation` y `setPlayerSide` de lib.

- [ ] **Step 3: Save validation**

Misma validación que create: convocados ≥2, ≥1 por lado, capitán y DT.

- [ ] **Step 4: openEdit reset**

Sincronizar `convokedIds` desde `match.playerSides`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MatchActions.tsx
git commit -m "feat: friendly match edit uses convocation and team assigner"
```

---

### Task 6: Cleanup FriendlyMatchRosterEditor

**Files:**
- Modify/Delete: `src/components/admin/FriendlyMatchRosterEditor.tsx`

- [ ] **Step 1: Grep imports**

Run: `rg FriendlyMatchRosterEditor`

- [ ] **Step 2: Remove file** if no imports remain; move `FriendlyRosterPlayer` type to `FriendlyMatchConvocationPicker.tsx` or shared `friendly-match-types.ts` and export from there.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy friendly match roster editor"
```

---

### Task 7: Verificación final

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`  
Expected: all pass

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Manual QA checklist**

1. Admin → Partidos → Crear amistoso: paso 1 convocar ≥2, paso 2 repartir A/B, crear OK
2. Editar partido: agregar convocado, mover de A a B, guardar OK
3. Capitán/DT obligatorios muestran error si faltan

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Wizard paso 1 convocatoria | Task 4 |
| Wizard paso 2 equipos A/B | Task 3, 4 |
| Capitán/DT obligatorios | Task 4, 5 |
| Edición mismo UI | Task 5 |
| Helpers reparto inicial | Task 1 |
| Sin cambios API | — (sin task) |
| Tests unit helpers | Task 1 |
