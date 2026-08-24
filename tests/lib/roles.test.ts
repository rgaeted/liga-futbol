import { describe, it, expect } from 'vitest'
import {
  MembershipRole,
  canAccess,
  canAccessAreas,
  getDashboardPath,
  hasAnyMembershipRole,
  hasMembershipRole,
  membershipRoleFromLegacyUserRole,
  primaryMembershipRole,
  resolvePrimaryDashboardPath,
} from '@/lib/membership-role'

describe('membership roles', () => {
  it('org admin can access admin area', () => {
    expect(canAccess(MembershipRole.ORG_ADMIN, 'admin')).toBe(true)
  })

  it('player cannot access admin', () => {
    expect(canAccess(MembershipRole.PLAYER, 'admin')).toBe(false)
  })

  it('returns tenant dashboard paths', () => {
    expect(getDashboardPath('kelme', MembershipRole.COACH)).toBe('/kelme/coach')
    expect(getDashboardPath('kelme', MembershipRole.REFEREE)).toBe('/kelme/referee')
    expect(getDashboardPath('kelme', MembershipRole.ORG_ADMIN)).toBe('/kelme/admin')
    expect(getDashboardPath('kelme', MembershipRole.FRIENDLY_COACH)).toBe(
      '/kelme/player/friendly-matches',
    )
  })

  it('maps legacy ADMIN to ORG_ADMIN', () => {
    expect(membershipRoleFromLegacyUserRole('ADMIN')).toBe(MembershipRole.ORG_ADMIN)
  })
})

describe('multi-role helpers', () => {
  it('hasAnyMembershipRole checks intersection', () => {
    expect(
      hasAnyMembershipRole(
        [MembershipRole.PLAYER, MembershipRole.FRIENDLY_COACH],
        [MembershipRole.FRIENDLY_COACH],
      ),
    ).toBe(true)
    expect(hasAnyMembershipRole([MembershipRole.PLAYER], [MembershipRole.ORG_ADMIN])).toBe(false)
  })

  it('canAccessAreas unions role areas', () => {
    expect(
      canAccessAreas([MembershipRole.ORG_ADMIN, MembershipRole.PLAYER], 'admin'),
    ).toBe(true)
    expect(
      canAccessAreas([MembershipRole.PLAYER, MembershipRole.FRIENDLY_COACH], 'player'),
    ).toBe(true)
    expect(canAccessAreas([MembershipRole.REFEREE], 'admin')).toBe(false)
  })

  it('resolvePrimaryDashboardPath prefers admin', () => {
    expect(
      resolvePrimaryDashboardPath('kelme', [
        MembershipRole.PLAYER,
        MembershipRole.ORG_ADMIN,
      ]),
    ).toBe('/kelme/admin')
  })

  it('primaryMembershipRole follows dashboard priority', () => {
    expect(
      primaryMembershipRole([MembershipRole.PLAYER, MembershipRole.FRIENDLY_COACH]),
    ).toBe(MembershipRole.FRIENDLY_COACH)
    expect(
      primaryMembershipRole([MembershipRole.PLAYER, MembershipRole.ORG_ADMIN]),
    ).toBe(MembershipRole.ORG_ADMIN)
  })

  it('hasMembershipRole checks single role', () => {
    expect(hasMembershipRole([MembershipRole.PLAYER], MembershipRole.PLAYER)).toBe(true)
    expect(hasMembershipRole([MembershipRole.PLAYER], MembershipRole.COACH)).toBe(false)
  })
})
