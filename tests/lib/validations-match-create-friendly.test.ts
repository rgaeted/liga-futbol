import { describe, expect, it } from 'vitest'
import { createFriendlyMatchSchema, updateMatchSchema } from '@/lib/validations/match'

const baseFriendly = {
  matchType: 'FRIENDLY' as const,
  friendlyCategoryId: 'cat1',
  sideAName: 'Blancos',
  sideBName: 'Negros',
  scheduledAt: '2026-09-14T21:00:00.000Z',
}

describe('createFriendlyMatchSchema', () => {
  it('accepts an intra friendly without players', () => {
    expect(createFriendlyMatchSchema.safeParse(baseFriendly).success).toBe(true)
    expect(createFriendlyMatchSchema.safeParse({ ...baseFriendly, players: [] }).success).toBe(true)
  })

  it('still rejects a partial roster on create', () => {
    expect(
      createFriendlyMatchSchema.safeParse({
        ...baseFriendly,
        players: [{ playerId: 'p1', side: 'A' }],
      }).success
    ).toBe(false)
  })
})

describe('updateMatchSchema players', () => {
  it('accepts a full roster that includes a non-attendee extra', () => {
    const players = [
      { playerId: 'p1', side: 'A' as const, isCaptain: true, isCoach: true },
      { playerId: 'p2', side: 'B' as const, isCaptain: true, isCoach: true },
      { playerId: 'extra', side: 'A' as const },
    ]
    expect(updateMatchSchema.safeParse({ players }).success).toBe(true)
  })
})
