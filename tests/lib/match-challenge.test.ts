import { describe, expect, it } from 'vitest'
import { ChallengeStatus, MatchType } from '@prisma/client'
import {
  assertChallengeCreate,
  assertCanEditFriendlySide,
  assertCanGoLive,
  nextChallengeStatus,
} from '@/lib/match-challenge'

describe('assertChallengeCreate', () => {
  it('rejects guest equal to host', () => {
    expect(() =>
      assertChallengeCreate({ hostOrganizationId: 'h', guestOrganizationId: 'h' }),
    ).toThrow(/misma/)
  })
})

describe('assertCanEditFriendlySide', () => {
  it('blocks host from editing side B on a challenge', () => {
    expect(
      assertCanEditFriendlySide({
        actorOrganizationId: 'h',
        match: {
          organizationId: 'h',
          guestOrganizationId: 'g',
          challengeStatus: ChallengeStatus.ACCEPTED,
          matchType: MatchType.FRIENDLY,
        },
        side: 'B',
      }),
    ).toBe(false)
  })

  it('allows guest to edit side B after accept', () => {
    expect(
      assertCanEditFriendlySide({
        actorOrganizationId: 'g',
        match: {
          organizationId: 'h',
          guestOrganizationId: 'g',
          challengeStatus: ChallengeStatus.ACCEPTED,
          matchType: MatchType.FRIENDLY,
        },
        side: 'B',
      }),
    ).toBe(true)
  })
})

describe('assertCanGoLive', () => {
  it('blocks LIVE while PENDING', () => {
    expect(
      assertCanGoLive({
        matchType: MatchType.FRIENDLY,
        challengeStatus: ChallengeStatus.PENDING,
        sideAReady: true,
        sideBReady: false,
      }),
    ).toEqual({ ok: false, error: 'El desafío todavía no fue aceptado' })
  })

  it('allows intra-org NONE', () => {
    expect(
      assertCanGoLive({
        matchType: MatchType.FRIENDLY,
        challengeStatus: ChallengeStatus.NONE,
        sideAReady: true,
        sideBReady: true,
      }),
    ).toEqual({ ok: true })
  })
})

describe('nextChallengeStatus', () => {
  it('maps accept/decline/cancel', () => {
    expect(nextChallengeStatus('accept', ChallengeStatus.PENDING)).toBe(ChallengeStatus.ACCEPTED)
    expect(nextChallengeStatus('decline', ChallengeStatus.PENDING)).toBe(ChallengeStatus.DECLINED)
    expect(nextChallengeStatus('cancel', ChallengeStatus.PENDING)).toBe(ChallengeStatus.CANCELLED)
    expect(() => nextChallengeStatus('accept', ChallengeStatus.ACCEPTED)).toThrow(/pendiente/)
  })
})
