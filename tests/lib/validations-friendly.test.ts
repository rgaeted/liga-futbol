import { describe, it, expect } from 'vitest'
import {
  createFriendlyPlayerSchema,
  claimFriendlyPlayerSchema,
} from '@/lib/validations/friendly-player'
import {
  createMatchSchema,
  updateFriendlyPaidSchema,
} from '@/lib/validations/match'

describe('friendly player validations', () => {
  it('accepts first and last name only', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional account fields together', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@demo.cl',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects email without password', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@demo.cl',
    })
    expect(result.success).toBe(false)
  })

  it('claim requires email password and friendlyPlayerId', () => {
    const result = claimFriendlyPlayerSchema.safeParse({
      email: 'nuevo@demo.cl',
      password: 'password123',
      friendlyPlayerId: 'fp-1',
    })
    expect(result.success).toBe(true)
  })
})

describe('friendly match validations', () => {
  it('accepts friendly match with players on both sides', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A' },
        { friendlyPlayerId: 'fp-2', side: 'B' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects friendly without a player on side B', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [{ friendlyPlayerId: 'fp-1', side: 'A' }],
    })
    expect(result.success).toBe(false)
  })

  it('still accepts league match without matchType (default LEAGUE)', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      homeTeamId: 'demo-team-norte',
      awayTeamId: 'demo-team-sur',
      scheduledAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matchType).toBe('LEAGUE')
    }
  })

  it('updateFriendlyPaidSchema accepts boolean', () => {
    expect(updateFriendlyPaidSchema.safeParse({ paid: true }).success).toBe(true)
  })
})