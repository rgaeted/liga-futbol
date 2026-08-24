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
