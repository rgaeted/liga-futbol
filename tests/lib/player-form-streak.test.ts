import { describe, it, expect } from 'vitest'
import { computePlayerFormStreak, countPlayedMatches } from '@/lib/player-form-streak'

describe('computePlayerFormStreak', () => {
  it('returns last five results oldest-first', () => {
    const form = computePlayerFormStreak({
      playerTeamId: 'home',
      leagueCallUps: [],
      friendlyParticipations: [
        {
          side: 'A',
          match: { scheduledAt: new Date('2026-09-01'), status: 'FINISHED', homeScore: 2, awayScore: 1 },
        },
        {
          side: 'A',
          match: { scheduledAt: new Date('2026-09-08'), status: 'FINISHED', homeScore: 1, awayScore: 3 },
        },
        {
          side: 'B',
          match: { scheduledAt: new Date('2026-09-15'), status: 'FINISHED', homeScore: 4, awayScore: 4 },
        },
      ],
      limit: 5,
    })

    expect(form).toEqual(['W', 'L', 'D'])
  })
})

describe('countPlayedMatches', () => {
  it('sums won drawn lost', () => {
    expect(countPlayedMatches({ won: 5, drawn: 0, lost: 1 })).toBe(6)
  })
})
