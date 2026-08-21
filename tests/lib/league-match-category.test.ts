import { describe, expect, it } from 'vitest'
import { validateLeagueMatchTeams } from '@/lib/league-match-category'

describe('validateLeagueMatchTeams', () => {
  it('rejects home and away equal', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't1',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBe('Local y visita deben ser clubes distintos.')
  })

  it('rejects a club not enrolled in the category', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't3',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBe('Local y visita deben estar inscritos en esta categoría.')
  })

  it('accepts two enrolled clubs', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't2',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBeNull()
  })
})
