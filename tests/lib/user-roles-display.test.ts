import { describe, it, expect } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { resolveUserRoleTags } from '@/lib/user-roles-display'

describe('resolveUserRoleTags', () => {
  it('lists all roles with least restrictive first', () => {
    const tags = resolveUserRoleTags({
      roles: [MembershipRole.PLAYER, MembershipRole.FRIENDLY_COACH],
      hasCoachedTeam: false,
      hasLeagueTeam: true,
      hasFriendlyProfile: true,
      isFriendlyCoach: true,
    })
    expect(tags.map((t) => t.id)).toEqual([
      'coach_friendly',
      'player_league',
      'player_friendly',
    ])
  })

  it('puts admin before any other role', () => {
    const tags = resolveUserRoleTags({
      roles: [MembershipRole.ORG_ADMIN, MembershipRole.PLAYER],
      hasCoachedTeam: false,
      hasLeagueTeam: false,
      hasFriendlyProfile: true,
      isFriendlyCoach: false,
    })
    expect(tags[0]?.id).toBe('admin')
    expect(tags.some((t) => t.id === 'player_friendly')).toBe(true)
  })

  it('shows league coach from team assignment or COACH role', () => {
    expect(
      resolveUserRoleTags({
        roles: [MembershipRole.COACH],
        hasCoachedTeam: true,
        hasLeagueTeam: false,
        hasFriendlyProfile: false,
        isFriendlyCoach: false,
      }).map((t) => t.id)
    ).toEqual(['coach_league'])
  })

  it('falls back to generic player when no profile flags', () => {
    expect(
      resolveUserRoleTags({
        roles: [MembershipRole.PLAYER],
        hasCoachedTeam: false,
        hasLeagueTeam: false,
        hasFriendlyProfile: false,
        isFriendlyCoach: false,
      }).map((t) => t.id)
    ).toEqual(['player'])
  })
})
