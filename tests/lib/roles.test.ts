import { describe, expect, it } from 'vitest'
import {
  MembershipRole,
  canAccess,
  getDashboardPath,
  membershipRoleFromLegacyUserRole,
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
