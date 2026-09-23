import { describe, expect, it } from 'vitest'
import {
  LEAGUE_TEAM_LIMIT,
  assertCanCreateTeam,
  assertOrgCapability,
  planHasCapability,
} from '@/lib/billing/capabilities'

describe('planHasCapability', () => {
  it('lets every plan view and play', () => {
    for (const plan of ['FREE', 'CLUB', 'LEAGUE'] as const) {
      expect(planHasCapability(plan, 'VIEW_PUBLIC')).toBe(true)
      expect(planHasCapability(plan, 'PLAY')).toBe(true)
    }
  })

  it('lets Club manage teams and friendlies but not seasons', () => {
    expect(planHasCapability('CLUB', 'MANAGE_TEAMS')).toBe(true)
    expect(planHasCapability('CLUB', 'MANAGE_FRIENDLIES')).toBe(true)
    expect(planHasCapability('CLUB', 'MANAGE_SEASONS')).toBe(false)
    expect(planHasCapability('CLUB', 'MANAGE_LEAGUE_MATCHES')).toBe(false)
    expect(planHasCapability('CLUB', 'PUBLISH_TEAM_PAGES')).toBe(false)
  })

  it('lets League manage seasons, league matches and team pages', () => {
    expect(planHasCapability('LEAGUE', 'MANAGE_SEASONS')).toBe(true)
    expect(planHasCapability('LEAGUE', 'MANAGE_LEAGUE_MATCHES')).toBe(true)
    expect(planHasCapability('LEAGUE', 'PUBLISH_TEAM_PAGES')).toBe(true)
    expect(planHasCapability('LEAGUE', 'MANAGE_LEAGUE_CONTENT')).toBe(true)
  })

  it('blocks Free from organizing', () => {
    expect(planHasCapability('FREE', 'MANAGE_TEAMS')).toBe(false)
    expect(planHasCapability('FREE', 'MANAGE_FRIENDLIES')).toBe(false)
    expect(planHasCapability('FREE', 'MANAGE_USERS')).toBe(false)
  })
})

describe('assertOrgCapability', () => {
  it('returns ok for an allowed capability', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_FRIENDLIES')).toEqual({ ok: true })
  })

  it('returns the upgrade message when blocked', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_SEASONS')).toEqual({
      ok: false,
      error: 'Tu plan no incluye esto. Pasa a Club o Liga para desbloquearlo.',
    })
  })
})

describe('assertCanCreateTeam', () => {
  it('blocks Free', () => {
    expect(assertCanCreateTeam({ plan: 'FREE', currentTeamCount: 0 }).ok).toBe(false)
  })

  it('allows Club without a team cap', () => {
    expect(assertCanCreateTeam({ plan: 'CLUB', currentTeamCount: 80 })).toEqual({ ok: true })
  })

  it('allows League below the cap and blocks at 50', () => {
    expect(LEAGUE_TEAM_LIMIT).toBe(50)
    expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 49 })).toEqual({ ok: true })
    expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 50 })).toEqual({
      ok: false,
      error: 'El plan Liga permite hasta 50 equipos.',
    })
  })
})
