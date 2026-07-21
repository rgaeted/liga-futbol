import { describe, it, expect } from 'vitest'
import { eventTeamLabel, matchDisplayName, matchSideNames, resolveEventTeamLabel } from '@/lib/match-label'

describe('matchDisplayName', () => {
  it('uses team names for league matches', () => {
    expect(
      matchDisplayName({
        matchType: 'LEAGUE',
        sideAName: null,
        sideBName: null,
        homeTeam: { name: 'Norte' },
        awayTeam: { name: 'Sur' },
      })
    ).toBe('Norte vs Sur')
  })

  it('uses side names for friendly matches', () => {
    expect(
      matchDisplayName({
        matchType: 'FRIENDLY',
        sideAName: 'Blancos',
        sideBName: 'Negros',
        homeTeam: null,
        awayTeam: null,
      })
    ).toBe('Blancos vs Negros')
  })
})

describe('matchSideNames', () => {
  it('maps friendly sides to home/away labels', () => {
    expect(
      matchSideNames({
        matchType: 'FRIENDLY',
        sideAName: 'A',
        sideBName: 'B',
        homeTeam: null,
        awayTeam: null,
      })
    ).toEqual({ home: 'A', away: 'B' })
  })
})

describe('eventTeamLabel', () => {
  const leagueMatch = {
    matchType: 'LEAGUE' as const,
    sideAName: null,
    sideBName: null,
    homeTeam: { name: 'Norte' },
    awayTeam: { name: 'Sur' },
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
  }

  it('returns home team name for league home teamId', () => {
    expect(eventTeamLabel({ teamId: 'home-id' }, leagueMatch)).toBe('Norte')
  })

  it('returns friendly side name', () => {
    expect(
      eventTeamLabel(
        { side: 'B' },
        {
          matchType: 'FRIENDLY',
          sideAName: 'Blancos',
          sideBName: 'Negros',
          homeTeam: null,
          awayTeam: null,
        }
      )
    ).toBe('Negros')
  })

  it('falls back to player team id', () => {
    expect(
      eventTeamLabel({ playerTeamId: 'away-id' }, leagueMatch)
    ).toBe('Sur')
  })
})

describe('resolveEventTeamLabel', () => {
  it('uses friendly participation side for legacy events', () => {
    expect(
      resolveEventTeamLabel(
        { friendlyPlayerId: 'fp-1', friendlySide: 'A' },
        {
          matchType: 'FRIENDLY',
          sideAName: 'Blancos',
          sideBName: 'Negros',
          homeTeam: null,
          awayTeam: null,
        }
      )
    ).toBe('Blancos')
  })

  it('uses player team name when ids are missing', () => {
    expect(
      resolveEventTeamLabel(
        { playerTeamName: 'Kelme Norte' },
        {
          matchType: 'LEAGUE',
          sideAName: null,
          sideBName: null,
          homeTeam: { name: 'Norte' },
          awayTeam: { name: 'Sur' },
        }
      )
    ).toBe('Kelme Norte')
  })
})
