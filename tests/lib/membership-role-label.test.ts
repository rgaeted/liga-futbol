import { describe, expect, it } from 'vitest'
import { MembershipRole, membershipRoleLabel } from '@/lib/membership-role'

describe('membershipRoleLabel', () => {
  it('returns Spanish labels per role', () => {
    expect(membershipRoleLabel(MembershipRole.ORG_ADMIN)).toBe('Administrador')
    expect(membershipRoleLabel(MembershipRole.FRIENDLY_COACH)).toBe('DT amistoso')
  })
})
