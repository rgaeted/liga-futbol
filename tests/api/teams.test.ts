import { describe, it, expect } from 'vitest'
import { createTeamSchema } from '@/lib/validations/team'

describe('teams API validation', () => {
  it('accepts valid team name', () => {
    const result = createTeamSchema.safeParse({ name: 'Equipo A' })
    expect(result.success).toBe(true)
  })

  it('rejects empty team name', () => {
    const result = createTeamSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
  })
})
