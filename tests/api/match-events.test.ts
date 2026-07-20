import { describe, it, expect } from 'vitest'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { EventType } from '@prisma/client'

describe('match event validation', () => {
  it('accepts goal event', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.GOAL,
      minute: 45,
      playerId: 'clxyz123456789012345678901',
      teamId: 'clxyz123456789012345678902',
    })
    expect(result.success).toBe(true)
  })

  it('accepts event without minute for auto clock', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.KICKOFF,
    })
    expect(result.success).toBe(true)
  })

  it('rejects minute over 130', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.GOAL,
      minute: 200,
    })
    expect(result.success).toBe(false)
  })

  it('accepts friendly goal with friendlyPlayerId and side', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.GOAL,
      minute: 12,
      friendlyPlayerId: 'fp-1',
      side: 'A',
    })
    expect(result.success).toBe(true)
  })

  it('accepts kickoff without player fields', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.KICKOFF,
    })
    expect(result.success).toBe(true)
  })
})
