import { describe, it, expect } from 'vitest'
import { claimPlayerSchema } from '@/lib/validations/player'
import {
  createFriendlyPlayerSchema,
  updateFriendlyPlayerSchema,
} from '@/lib/validations/friendly-player'
import {
  createMatchSchema,
  createFriendlyChallengeSchema,
  updateFriendlyPaidSchema,
} from '@/lib/validations/match'

describe('friendly player validations', () => {
  it('accepts first and last name with category', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
      friendlyCategoryIds: ['cat-1'],
    })
    expect(result.success).toBe(true)
  })

  it('requires friendlyCategoryIds when creating friendly player', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
    })
    expect(result.success).toBe(false)
  })

  it('accepts multiple categories when creating friendly player', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
      friendlyCategoryIds: ['cat-1', 'cat-2'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts profile fields', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
      friendlyCategoryIds: ['cat-1'],
      dominantFoot: 'RIGHT',
      primaryPosition: 'Delantero',
      secondaryPosition: 'Extremo derecho',
    })
    expect(result.success).toBe(true)
  })

  it('rejects duplicate primary and secondary position', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
      friendlyCategoryIds: ['cat-1'],
      primaryPosition: 'Delantero',
      secondaryPosition: 'Delantero',
    })
    expect(result.success).toBe(false)
  })

  it('accepts create with email and password together', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      friendlyCategoryIds: ['cat-1'],
      email: 'ana@demo.cl',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('ignores empty email and password fields', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      friendlyCategoryIds: ['cat-1'],
      email: '',
      password: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects email without password', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      friendlyCategoryIds: ['cat-1'],
      email: 'ana@demo.cl',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional account fields together', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      friendlyCategoryIds: ['cat-1'],
      email: 'ana@demo.cl',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects email without password when category provided', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      friendlyCategoryIds: ['cat-1'],
      email: 'ana@demo.cl',
    })
    expect(result.success).toBe(false)
  })

  it('claim requires email password and playerId', () => {
    const result = claimPlayerSchema.safeParse({
      email: 'nuevo@demo.cl',
      password: 'password123',
      playerId: 'p-1',
    })
    expect(result.success).toBe(true)
  })

  it('update accepts email and password to create account', () => {
    const result = updateFriendlyPlayerSchema.safeParse({
      email: 'nuevo@demo.cl',
      password: 'password123',
      friendlyCategoryIds: ['cat-1'],
    })
    expect(result.success).toBe(true)
  })

  it('update rejects email without password', () => {
    const result = updateFriendlyPlayerSchema.safeParse({
      email: 'nuevo@demo.cl',
      friendlyCategoryIds: ['cat-1'],
    })
    expect(result.success).toBe(false)
  })
})

describe('friendly match validations', () => {
  it('requires friendlyCategoryId for friendly match', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('accepts friendly match with category and roster', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts friendly match with players on both sides', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects friendly without a player on side B', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [{ playerId: 'fp-1', side: 'A' }],
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

describe('friendly challenge validations', () => {
  it('intra-org schema still fails without side B', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('challenge schema succeeds with only side A captain and DT', () => {
    const result = createFriendlyChallengeSchema.safeParse({
      matchType: 'FRIENDLY',
      guestOrganizationSlug: 'other-org',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Kelme',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('challenge schema fails if a side B player is present', () => {
    const result = createFriendlyChallengeSchema.safeParse({
      matchType: 'FRIENDLY',
      guestOrganizationSlug: 'other-org',
      friendlyCategoryId: 'cat-1',
      sideAName: 'Kelme',
      scheduledAt: new Date().toISOString(),
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(false)
  })
})
