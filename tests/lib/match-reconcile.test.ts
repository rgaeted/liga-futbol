import { describe, it, expect } from 'vitest'
import { computeScoresFromEvents } from '@/lib/match-reconcile'
import { EventType, MatchType } from '@prisma/client'

describe('computeScoresFromEvents', () => {
  it('counts league goals by team', () => {
    const scores = computeScoresFromEvents(MatchType.LEAGUE, 'home', 'away', [
      { type: EventType.GOAL, teamId: 'home', side: null },
      { type: EventType.GOAL, teamId: 'home', side: null },
      { type: EventType.GOAL, teamId: 'away', side: null },
      { type: EventType.OWN_GOAL, teamId: 'home', side: null },
    ])
    expect(scores).toEqual({ homeScore: 2, awayScore: 2 })
  })

  it('counts friendly goals by side', () => {
    const scores = computeScoresFromEvents(MatchType.FRIENDLY, null, null, [
      { type: EventType.GOAL, teamId: null, side: 'A' },
      { type: EventType.GOAL, teamId: null, side: 'B' },
      { type: EventType.OWN_GOAL, teamId: null, side: 'A' },
    ])
    expect(scores).toEqual({ homeScore: 1, awayScore: 2 })
  })
})
