import { describe, it, expect } from 'vitest'
import { EventType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'

describe('isScoringGoalEvent', () => {
  it('includes regular and penalty goals', () => {
    expect(isScoringGoalEvent(EventType.GOAL)).toBe(true)
    expect(isScoringGoalEvent(EventType.PENALTY_GOAL)).toBe(true)
  })

  it('excludes missed penalties and own goals', () => {
    expect(isScoringGoalEvent(EventType.MISSED_PENALTY)).toBe(false)
    expect(isScoringGoalEvent(EventType.OWN_GOAL)).toBe(false)
  })
})
