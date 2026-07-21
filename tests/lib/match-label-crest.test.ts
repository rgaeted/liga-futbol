import { describe, it, expect } from 'vitest'
import { resolveEventTeamCrest } from '@/lib/match-label'

describe('resolveEventTeamCrest', () => {
  const crests = {
    homeName: 'Blancos',
    awayName: 'Negros',
    homeCrestSrc: '/api/teams/home/crest',
    awayCrestSrc: '/api/matches/m1/crest/B',
  }

  it('maps home team name to home crest', () => {
    expect(resolveEventTeamCrest('Blancos', crests)).toBe('/api/teams/home/crest')
  })

  it('maps away team name to away crest', () => {
    expect(resolveEventTeamCrest('Negros', crests)).toBe('/api/matches/m1/crest/B')
  })

  it('returns null for unknown team', () => {
    expect(resolveEventTeamCrest('Otros', crests)).toBeNull()
  })
})
