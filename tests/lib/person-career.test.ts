import { describe, expect, it } from 'vitest'
import { EventType, MatchType } from '@prisma/client'
import { buildPersonCareer } from '@/lib/person-career'

describe('buildPersonCareer', () => {
  it('keeps league goals out of friendly totals', () => {
    const career = buildPersonCareer({
      person: { id: 'p1', firstName: 'Ana', lastName: 'Rojas', userId: 'u1' },
      leagueMatchIds: ['m1'],
      friendlyMatchIds: ['m2'],
      events: [
        { matchId: 'm1', matchType: MatchType.LEAGUE, type: EventType.GOAL, isAssist: false },
        { matchId: 'm1', matchType: MatchType.LEAGUE, type: EventType.GOAL, isAssist: true },
        { matchId: 'm2', matchType: MatchType.FRIENDLY, type: EventType.GOAL, isAssist: false },
        { matchId: 'm2', matchType: MatchType.FRIENDLY, type: EventType.YELLOW_CARD, isAssist: false },
      ],
      leagueMvpCount: 1,
      friendlyMvpCount: 0,
    })
    expect(career.league.goals).toBe(1)
    expect(career.league.assists).toBe(1)
    expect(career.friendly.goals).toBe(1)
    expect(career.friendly.yellowCards).toBe(1)
    expect(career.total.goals).toBe(2)
    expect(career.total.matches).toBe(2)
    expect(career.person.hasAccount).toBe(true)
  })
})
