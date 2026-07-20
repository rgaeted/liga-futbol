import { describe, it, expect } from 'vitest'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'

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
