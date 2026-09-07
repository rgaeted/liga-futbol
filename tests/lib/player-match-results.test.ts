import { describe, it, expect } from 'vitest'
import { computePlayerMatchResults } from '@/lib/player-match-results'

describe('computePlayerMatchResults', () => {
  it('counts league wins, draws and losses from the player team', () => {
    const result = computePlayerMatchResults({
      playerTeamId: 'team-home',
      leagueCallUps: [
        {
          match: {
            status: 'FINISHED',
            homeTeamId: 'team-home',
            awayTeamId: 'team-away',
            homeScore: 2,
            awayScore: 1,
          },
        },
        {
          match: {
            status: 'FINISHED',
            homeTeamId: 'team-home',
            awayTeamId: 'team-away',
            homeScore: 1,
            awayScore: 1,
          },
        },
        {
          match: {
            status: 'FINISHED',
            homeTeamId: 'team-away',
            awayTeamId: 'team-home',
            homeScore: 3,
            awayScore: 0,
          },
        },
      ],
      friendlyParticipations: [],
    })

    expect(result).toEqual({ won: 1, drawn: 1, lost: 1 })
  })

  it('counts friendly results by side A/B', () => {
    const result = computePlayerMatchResults({
      playerTeamId: null,
      leagueCallUps: [],
      friendlyParticipations: [
        {
          side: 'A',
          match: { status: 'FINISHED', homeScore: 3, awayScore: 1 },
        },
        {
          side: 'B',
          match: { status: 'FINISHED', homeScore: 2, awayScore: 2 },
        },
        {
          side: 'B',
          match: { status: 'FINISHED', homeScore: 1, awayScore: 0 },
        },
      ],
    })

    expect(result).toEqual({ won: 1, drawn: 1, lost: 1 })
  })

  it('ignores scheduled matches and call-ups without a matching team', () => {
    const result = computePlayerMatchResults({
      playerTeamId: 'team-other',
      leagueCallUps: [
        {
          match: {
            status: 'SCHEDULED',
            homeTeamId: 'team-home',
            awayTeamId: 'team-away',
            homeScore: 0,
            awayScore: 0,
          },
        },
        {
          match: {
            status: 'FINISHED',
            homeTeamId: 'team-home',
            awayTeamId: 'team-away',
            homeScore: 2,
            awayScore: 0,
          },
        },
      ],
      friendlyParticipations: [],
    })

    expect(result).toEqual({ won: 0, drawn: 0, lost: 0 })
  })
})
