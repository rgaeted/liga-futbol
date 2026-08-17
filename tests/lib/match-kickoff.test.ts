import { describe, it, expect } from 'vitest'
import { EventType, MatchType } from '@prisma/client'
import {
  kickoffTeamFromEvent,
  oppositeKickoffSide,
  kickoffSideToFriendly,
} from '@/lib/match-kickoff'

describe('match-kickoff', () => {
  it('maps friendly kickoff side A to home', () => {
    expect(
      kickoffTeamFromEvent(
        { type: EventType.KICKOFF, side: 'A', teamId: null },
        { matchType: MatchType.FRIENDLY, homeTeamId: null, awayTeamId: null }
      )
    ).toBe('home')
  })

  it('maps league kickoff teamId to home or away', () => {
    expect(
      kickoffTeamFromEvent(
        { type: EventType.KICKOFF, side: null, teamId: 'home-1' },
        { matchType: MatchType.LEAGUE, homeTeamId: 'home-1', awayTeamId: 'away-1' }
      )
    ).toBe('home')
  })

  it('returns opposite side for second-half kickoff', () => {
    expect(oppositeKickoffSide('home')).toBe('away')
    expect(oppositeKickoffSide('away')).toBe('home')
  })

  it('converts kickoff side to friendly enum', () => {
    expect(kickoffSideToFriendly('home')).toBe('A')
    expect(kickoffSideToFriendly('away')).toBe('B')
  })
})
