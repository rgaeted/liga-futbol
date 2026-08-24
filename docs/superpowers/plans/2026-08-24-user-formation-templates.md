# Formación — plantillas personalizadas por usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir guardar, elegir, renombrar y eliminar formaciones personalizadas (esquema base + posiciones en cancha) por usuario, visibles en el selector junto a las clásicas.

**Architecture:** Tabla `UserFormationTemplate` scoped por `userId` + `footballFormat`; CRUD en `/api/me/formation-templates`; helpers con prefijo `custom:{id}` en el selector; `FormationEditor` carga plantillas y gestiona optgroups; al guardar partido se persiste `baseScheme` + `slotLayout` en `MatchFormation` (sin cambio al modelo de partido).

**Tech Stack:** Next.js 16, Prisma 7, Zod, Vitest, fetch client en editores existentes.

**Spec:** `docs/superpowers/specs/2026-08-24-user-formation-templates-design.md`

## Global Constraints

- UI en español chileno (`es-CL`), tuteo.
- Plantillas **por usuario**, no por equipo.
- Solo guarda `baseScheme` + `slotLayout`; **nunca** jugadores.
- `MatchFormation.scheme` siempre es esquema clásico (`4-4-2`), nunca `custom:…`.
- Reutilizar `validateSlotLayout` y `isValidScheme` existentes.
- Migración prod: `supabase db query --linked` si Vercel build no corre migrate.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Modelo `UserFormationTemplate` + relación en `User` |
| `prisma/migrations/20260824200000_user_formation_template/migration.sql` | CREATE TABLE |
| `src/lib/user-formation-templates.ts` | Prefijo `custom:`, resolver selección, label |
| `tests/lib/user-formation-templates.test.ts` | Unit tests helpers |
| `src/lib/validations/user-formation-template.ts` | Zod create/rename |
| `tests/lib/validations-user-formation-template.test.ts` | Validación Zod |
| `src/app/api/me/formation-templates/route.ts` | GET + POST |
| `src/app/api/me/formation-templates/[id]/route.ts` | PATCH + DELETE |
| `src/components/lineup/FormationEditor.tsx` | Optgroups, guardar/gestionar plantillas |
| `src/components/lineup/FormationTemplateManager.tsx` | Lista renombrar/eliminar (opcional extraer) |
| `src/components/coach/CallUpForm.tsx` | Fetch + pasar templates |
| `src/components/admin/LeagueLineupEditor.tsx` | Fetch + pasar templates |
| `src/components/admin/FriendlyLineupEditor.tsx` | Fetch + pasar templates |

---

### Task 1: Migración + helpers de plantillas

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260824200000_user_formation_template/migration.sql`
- Create: `src/lib/user-formation-templates.ts`
- Create: `tests/lib/user-formation-templates.test.ts`

**Interfaces:**
- Produces:
  - `export const CUSTOM_SCHEME_PREFIX = 'custom:'`
  - `export type UserFormationTemplateDto = { id, name, baseScheme, footballFormat, slotLayout }`
  - `export function customSchemeValue(templateId: string): string`
  - `export function parseCustomSchemeId(value: string): string | null`
  - `export function isCustomSchemeValue(value: string): boolean`
  - `export function formatTemplateOptionLabel(name: string, baseScheme: string): string`
  - `export function resolveEditorSchemeSelection(selectValue, templates): { scheme, slotLayout, templateId }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  CUSTOM_SCHEME_PREFIX,
  customSchemeValue,
  parseCustomSchemeId,
  isCustomSchemeValue,
  formatTemplateOptionLabel,
  resolveEditorSchemeSelection,
  type UserFormationTemplateDto,
} from '@/lib/user-formation-templates'

const templates: UserFormationTemplateDto[] = [
  {
    id: 'tpl1',
    name: 'Rombo medio',
    baseScheme: '4-4-2',
    footballFormat: 'FUTBOL_11',
    slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
  },
]

describe('custom scheme prefix', () => {
  it('builds and parses custom values', () => {
    expect(customSchemeValue('tpl1')).toBe(`${CUSTOM_SCHEME_PREFIX}tpl1`)
    expect(parseCustomSchemeId(`${CUSTOM_SCHEME_PREFIX}tpl1`)).toBe('tpl1')
    expect(isCustomSchemeValue('4-4-2')).toBe(false)
  })
})

describe('formatTemplateOptionLabel', () => {
  it('shows name and base scheme', () => {
    expect(formatTemplateOptionLabel('Rombo medio', '4-4-2')).toBe('Rombo medio (4-4-2)')
  })
})

describe('resolveEditorSchemeSelection', () => {
  it('returns empty layout for classic scheme', () => {
    const result = resolveEditorSchemeSelection('4-3-3', templates, 'FUTBOL_11')
    expect(result).toEqual({ scheme: '4-3-3', slotLayout: {}, templateId: null })
  })

  it('resolves custom template to base scheme and layout', () => {
    const result = resolveEditorSchemeSelection(customSchemeValue('tpl1'), templates, 'FUTBOL_11')
    expect(result.scheme).toBe('4-4-2')
    expect(result.slotLayout).toEqual({ CM_L: { topPct: 50, leftPct: 50 } })
    expect(result.templateId).toBe('tpl1')
  })

  it('falls back to default when custom id missing', () => {
    const result = resolveEditorSchemeSelection(customSchemeValue('missing'), templates, 'FUTBOL_11')
    expect(result.scheme).toBe('4-3-3')
    expect(result.templateId).toBe(null)
  })
})
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run tests/lib/user-formation-templates.test.ts`

- [ ] **Step 3: Schema + migration + implement helpers**

Prisma (`User` model — agregar relación):
```prisma
formationTemplates UserFormationTemplate[]
```

Nuevo modelo:
```prisma
model UserFormationTemplate {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String
  baseScheme     String
  footballFormat FootballFormat
  slotLayout     Json
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([userId, footballFormat, name])
  @@index([userId, footballFormat])
}
```

Migration SQL:
```sql
CREATE TABLE "UserFormationTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseScheme" TEXT NOT NULL,
  "footballFormat" "FootballFormat" NOT NULL,
  "slotLayout" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserFormationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFormationTemplate_userId_footballFormat_name_key"
  ON "UserFormationTemplate"("userId", "footballFormat", "name");

CREATE INDEX "UserFormationTemplate_userId_footballFormat_idx"
  ON "UserFormationTemplate"("userId", "footballFormat");

ALTER TABLE "UserFormationTemplate"
  ADD CONSTRAINT "UserFormationTemplate_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Implement `user-formation-templates.ts` usando `getDefaultScheme` de `@/lib/formations` para fallback.

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/lib/user-formation-templates.test.ts`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260824200000_user_formation_template/ src/lib/user-formation-templates.ts tests/lib/user-formation-templates.test.ts
git commit -m "feat: add UserFormationTemplate model and selection helpers"
```

---

### Task 2: Validación Zod

**Files:**
- Create: `src/lib/validations/user-formation-template.ts`
- Create: `tests/lib/validations-user-formation-template.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  createUserFormationTemplateSchema,
  renameUserFormationTemplateSchema,
} from '@/lib/validations/user-formation-template'

describe('createUserFormationTemplateSchema', () => {
  it('accepts valid payload', () => {
    const result = createUserFormationTemplateSchema.safeParse({
      name: 'Rombo medio',
      baseScheme: '4-4-2',
      footballFormat: 'FUTBOL_11',
      slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
    })
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = createUserFormationTemplateSchema.safeParse({
      name: 'A',
      baseScheme: '4-4-2',
      footballFormat: 'FUTBOL_11',
      slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty slotLayout', () => {
    const result = createUserFormationTemplateSchema.safeParse({
      name: 'Vacía',
      baseScheme: '4-4-2',
      footballFormat: 'FUTBOL_11',
      slotLayout: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('renameUserFormationTemplateSchema', () => {
  it('trims name', () => {
    const result = renameUserFormationTemplateSchema.parse({ name: '  Nuevo  ' })
    expect(result.name).toBe('Nuevo')
  })
})
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run tests/lib/validations-user-formation-template.test.ts`

- [ ] **Step 3: Implement schemas**

```ts
import { z } from 'zod'
import { FootballFormat } from '@prisma/client'

const slotLayoutEntrySchema = z.object({
  topPct: z.number().finite().min(5).max(95),
  leftPct: z.number().finite().min(5).max(95),
})

export const createUserFormationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  baseScheme: z.string().min(1),
  footballFormat: z.nativeEnum(FootballFormat),
  slotLayout: z.record(z.string(), slotLayoutEntrySchema).refine(
    (layout) => Object.keys(layout).length > 0,
    { message: 'Debes ajustar al menos una posición' }
  ),
})

export const renameUserFormationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(40),
})
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/user-formation-template.ts tests/lib/validations-user-formation-template.test.ts
git commit -m "feat: add Zod schemas for user formation templates"
```

---

### Task 3: API CRUD `/api/me/formation-templates`

**Files:**
- Create: `src/app/api/me/formation-templates/route.ts`
- Create: `src/app/api/me/formation-templates/[id]/route.ts`

- [ ] **Step 1: Implement GET + POST**

`route.ts`:
- `GET`: auth; query `format` requerido (`FootballFormat`); `db.userFormationTemplate.findMany({ where: { userId, footballFormat: format }, orderBy: { name: 'asc' } })`.
- `POST`: parse body con `createUserFormationTemplateSchema`; validar `isValidScheme` + `validateSlotLayout`; `create`; 409 en unique violation (`P2002`).

Respuesta template:
```ts
function serializeTemplate(t: UserFormationTemplate) {
  return {
    id: t.id,
    name: t.name,
    baseScheme: t.baseScheme,
    footballFormat: t.footballFormat,
    slotLayout: t.slotLayout as SlotLayout,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
```

- [ ] **Step 2: Implement PATCH + DELETE**

`[id]/route.ts`:
- Buscar por `id`; 404 si no existe; 403 si `userId !== session.user.id`.
- `PATCH`: `renameUserFormationTemplateSchema`; update name.
- `DELETE`: `delete`.

- [ ] **Step 3: Manual smoke**

Run dev server; con sesión:
```bash
curl -s "http://localhost:3000/api/me/formation-templates?format=FUTBOL_11" -b cookies.txt
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/me/formation-templates/
git commit -m "feat: add CRUD API for user formation templates"
```

---

### Task 4: FormationEditor — selector + guardar plantilla

**Files:**
- Modify: `src/components/lineup/FormationEditor.tsx`
- Create: `src/components/lineup/useFormationTemplates.ts` (hook fetch + CRUD)

- [ ] **Step 1: Hook `useFormationTemplates`**

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FootballFormat } from '@prisma/client'
import type { UserFormationTemplateDto } from '@/lib/user-formation-templates'
import type { SlotLayout } from '@/lib/formation-slot-layout'

export function useFormationTemplates(footballFormat: FootballFormat) {
  const [templates, setTemplates] = useState<UserFormationTemplateDto[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/me/formation-templates?format=${footballFormat}`)
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates ?? [])
    }
    setLoading(false)
  }, [footballFormat])

  useEffect(() => { void refresh() }, [refresh])

  async function createTemplate(input: {
    name: string
    baseScheme: string
    slotLayout: SlotLayout
  }) {
    const res = await fetch('/api/me/formation-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, footballFormat }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo guardar la plantilla')
    }
    const { template } = await res.json()
    await refresh()
    return template as UserFormationTemplateDto
  }

  // renameTemplate, deleteTemplate — similar

  return { templates, loading, refresh, createTemplate, renameTemplate, deleteTemplate }
}
```

- [ ] **Step 2: Extend FormationEditor state**

- Nuevo state `selectValue: string` — clásico o `custom:{id}`.
- `onSchemeChange(nextSelectValue)` usa `resolveEditorSchemeSelection`.
- `<select>` con optgroups; `value={selectValue}`.
- Al guardar partido (`handleSave`): enviar `scheme` resuelto (clásico), no `selectValue`.

- [ ] **Step 3: Botón guardar plantilla**

```tsx
{!readOnly && Object.keys(slotLayout).length > 0 && (
  <button type="button" onClick={handleSaveTemplate}>
    Guardar como formación personalizada
  </button>
)}

async function handleSaveTemplate() {
  const name = window.prompt('Nombre de la formación personalizada')
  if (!name?.trim()) return
  const template = await createTemplate({ name: name.trim(), baseScheme: scheme, slotLayout })
  setSelectValue(customSchemeValue(template.id))
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lineup/FormationEditor.tsx src/components/lineup/useFormationTemplates.ts
git commit -m "feat: formation editor custom template selector and save"
```

---

### Task 5: FormationEditor — gestión renombrar/eliminar

**Files:**
- Modify: `src/components/lineup/FormationEditor.tsx`

- [ ] **Step 1: Sección Mis formaciones**

Debajo del selector, si `templates.length > 0`:

```tsx
<div className="space-y-2 rounded-lg border border-kelme-border p-3">
  <p className="text-xs font-medium uppercase tracking-wide text-kelme-gray-400">
    Mis formaciones
  </p>
  <ul className="space-y-1">
    {templates.map((t) => (
      <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
        <span>{formatTemplateOptionLabel(t.name, t.baseScheme)}</span>
        <span className="flex gap-2">
          <button type="button" onClick={() => handleRename(t.id, t.name)}>Renombrar</button>
          <button type="button" onClick={() => handleDelete(t.id)}>Eliminar</button>
        </span>
      </li>
    ))}
  </ul>
</div>
```

- [ ] **Step 2: Handlers**

- Renombrar: `window.prompt`; PATCH; si era la seleccionada, mantener `selectValue`.
- Eliminar: confirm; si era la seleccionada, volver a `scheme` clásico actual o default.

- [ ] **Step 3: Commit**

```bash
git add src/components/lineup/FormationEditor.tsx
git commit -m "feat: rename and delete user formation templates in editor"
```

---

### Task 6: Wire en editores padre

**Files:**
- Modify: `src/components/coach/CallUpForm.tsx`
- Modify: `src/components/admin/LeagueLineupEditor.tsx`
- Modify: `src/components/admin/FriendlyLineupEditor.tsx`

- [ ] **Step 1: Usar hook en FormationEditor internamente**

Preferir que `FormationEditor` llame `useFormationTemplates(footballFormat)` internamente — **no** requiere cambios en padres si el hook vive dentro del editor.

Verificar que `CallUpForm` no desmonte `FormationEditor` innecesariamente al cambiar convocados (pitfall existente).

- [ ] **Step 2: Verificar save payload**

Confirmar que `onSave` sigue enviando `payload.scheme` clásico (ej. `4-4-2`) aunque el select muestre custom.

- [ ] **Step 3: Commit** (solo si hubo cambios en padres)

```bash
git commit -m "chore: wire formation templates in lineup editors"
```

---

### Task 7: Verificación final

- [ ] **Step 1: Run all related tests**

```bash
npx vitest run tests/lib/user-formation-templates.test.ts tests/lib/validations-user-formation-template.test.ts tests/lib/formation-slot-layout.test.ts
```

- [ ] **Step 2: Typecheck**

```bash
npm run build
```

- [ ] **Step 3: Manual smoke**

1. Login como DT.
2. Abrir citación / lineup; activar **Ajustar posiciones**; mover un jugador.
3. **Guardar como formación personalizada** → nombre "Test rombo".
4. Recargar página; elegir plantilla en **Mis formaciones**; ver posiciones.
5. Renombrar y eliminar.

- [ ] **Step 4: Migración prod (cuando vaya a main)**

```bash
supabase db query --linked -f prisma/migrations/20260824200000_user_formation_template/migration.sql
```

- [ ] **Step 5: Commit SESSION-CONTEXT** (al desplegar prod)

Actualizar `docs/handoff/SESSION-CONTEXT.md` con feature, migración y pitfalls.

---

## Plan self-review

| Spec § | Task |
|--------|------|
| Modelo UserFormationTemplate | Task 1 |
| Helpers custom: | Task 1 |
| API GET/POST/PATCH/DELETE | Task 2, 3 |
| Optgroups selector | Task 4 |
| Guardar plantilla | Task 4 |
| Renombrar / eliminar | Task 5 |
| Liga / amistoso / citación | Task 6 |
| MatchFormation sin custom id | Task 4 (handleSave) |
| Pitfalls | Task 4, 6, 7 |

No placeholders detected.
