import { describe, it, expect } from 'vitest'
import { createTeamSchema, updateTeamSchema } from '@/lib/validations/team'

describe('teams API validation', () => {
  it('preserves the selected category when creating and editing a team', () => {
    expect(createTeamSchema.parse({ name: 'Equipo A', categoryId: 'category-1' }).categoryId).toBe('category-1')
    expect(updateTeamSchema.parse({ categoryId: 'category-2' }).categoryId).toBe('category-2')
  })

  it('allows clearing a category and rejects an empty category identifier', () => {
    expect(updateTeamSchema.parse({ categoryId: null }).categoryId).toBeNull()
    expect(updateTeamSchema.safeParse({ categoryId: '' }).success).toBe(false)
    expect(createTeamSchema.safeParse({ name: 'Equipo A', categoryId: '' }).success).toBe(false)
  })

  it('accepts valid team name', () => {
    const result = createTeamSchema.safeParse({ name: 'Equipo A' })
    expect(result.success).toBe(true)
  })

  it('rejects empty team name', () => {
    const result = createTeamSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
  })
})
