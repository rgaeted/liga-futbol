import { describe, expect, it } from 'vitest'
import { resolveScoringTeamId } from '@/lib/mobile/notifications/scoring-team'

const match = {
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  homeSeasonTeamId: 'st-home',
  awaySeasonTeamId: 'st-away',
}

describe('resolveScoringTeamId', () => {
  it('returns the scoring team for a regular goal', () => {
    expect(
      resolveScoringTeamId(match, { type: 'GOAL', teamId: 'team-home' }),
    ).toBe('st-home')
  })

  it('returns the benefited opponent for an own goal from home', () => {
    expect(
      resolveScoringTeamId(match, { type: 'OWN_GOAL', teamId: 'team-home' }),
    ).toBe('st-away')
  })

  it('returns the benefited opponent for an own goal from away', () => {
    expect(
      resolveScoringTeamId(match, { type: 'OWN_GOAL', teamId: 'team-away' }),
    ).toBe('st-home')
  })

  it('returns null when league team ids are missing', () => {
    expect(
      resolveScoringTeamId(
        { ...match, homeSeasonTeamId: null },
        { type: 'GOAL', teamId: 'team-home' },
      ),
    ).toBeNull()
  })
})
