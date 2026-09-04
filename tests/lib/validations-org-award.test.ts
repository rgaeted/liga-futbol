import { describe, it, expect } from 'vitest'
import {
  createOrgAwardSchema,
  updateOrgAwardSchema,
} from '@/lib/validations/org-award'

describe('org award validation', () => {
  it('accepts create with required fields', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Premio al 7 pulmones',
      shortLabel: '7 pulmones',
      emoji: '🫁',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty shortLabel', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Premio al 7 pulmones',
      shortLabel: '',
      emoji: '🫁',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid accentColor', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Fair play',
      shortLabel: 'Fair play',
      emoji: '🤝',
      accentColor: 'red',
    })
    expect(result.success).toBe(false)
  })

  it('accepts update with isActive false', () => {
    const result = updateOrgAwardSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })
})
