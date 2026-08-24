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
  it('rejects when dest already has REFEREE', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destHasReferee: true, pending: true }),
    ).toThrow(/ya pita/)
  })

  it('allows when dest has COACH but not REFEREE', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destHasReferee: false, pending: true }),
    ).not.toThrow()
  })

  it('allows when dest has no membership', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destHasReferee: false, pending: true }),
    ).not.toThrow()
  })
})
