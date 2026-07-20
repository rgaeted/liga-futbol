import { describe, it, expect } from 'vitest'
import { aggregateFriendlyEvents } from '@/lib/friendly-stats'
import { EventType } from '@prisma/client'

describe('aggregateFriendlyEvents', () => {
  it('counts goals and cards', () => {
    const stats = aggregateFriendlyEvents([
      { type: EventType.GOAL },
      { type: EventType.GOAL },
      { type: EventType.YELLOW_CARD },
      { type: EventType.RED_CARD },
      { type: EventType.SHOT_ON_TARGET },
    ])
    expect(stats).toEqual({
      goals: 2,
      yellowCards: 1,
      redCards: 1,
    })
  })
})
