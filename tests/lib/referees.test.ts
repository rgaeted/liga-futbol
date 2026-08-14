import { describe, expect, it } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { assertCanShareReferee, assertCanAcceptRefereeShare } from '@/lib/referees'

describe('assertCanShareReferee', () => {
  it('rejects sharing to the same org', () => {
    expect(() =>
      assertCanShareReferee({ fromOrganizationId: 'a', toOrganizationId: 'a', isRefereeInFrom: true }),
    ).toThrow(/misma/)
  })

  it('rejects when not referee in origin', () => {
    expect(() =>
      assertCanShareReferee({ fromOrganizationId: 'a', toOrganizationId: 'b', isRefereeInFrom: false }),
    ).toThrow(/origen/)
  })
})

describe('assertCanAcceptRefereeShare', () => {
  it('rejects existing non-REFEREE membership', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destRole: MembershipRole.COACH, pending: true }),
    ).toThrow(/otro rol/)
  })

  it('allows when dest has no membership', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destRole: null, pending: true }),
    ).not.toThrow()
  })
})
