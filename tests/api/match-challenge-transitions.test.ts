import { ChallengeStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as acceptChallenge } from '@/app/api/matches/[id]/challenge/accept/route'
import { POST as declineChallenge } from '@/app/api/matches/[id]/challenge/decline/route'
import { POST as cancelChallenge } from '@/app/api/matches/[id]/challenge/cancel/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    match: { findUnique: vi.fn(), update: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'

const hostOrgId = 'org-host'
const guestOrgId = 'org-guest'
const matchId = 'match-1'

describe('challenge transitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('guest accepts a pending challenge', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: guestOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: matchId,
      organizationId: hostOrgId,
      guestOrganizationId: guestOrgId,
      challengeStatus: ChallengeStatus.PENDING,
      matchType: 'FRIENDLY',
    } as never)
    vi.mocked(db.organization.findUnique).mockResolvedValue({ status: 'ACTIVE' } as never)
    vi.mocked(db.match.update).mockResolvedValue({
      id: matchId,
      challengeStatus: ChallengeStatus.ACCEPTED,
    } as never)

    const response = await acceptChallenge(new Request('http://localhost'), {
      params: Promise.resolve({ id: matchId }),
    })

    expect(response.status).toBe(200)
    expect(db.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { challengeStatus: ChallengeStatus.ACCEPTED },
      })
    )
  })

  it('returns 403 when host tries to accept', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: hostOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: matchId,
      organizationId: hostOrgId,
      guestOrganizationId: guestOrgId,
      challengeStatus: ChallengeStatus.PENDING,
    } as never)

    const response = await acceptChallenge(new Request('http://localhost'), {
      params: Promise.resolve({ id: matchId }),
    })

    expect(response.status).toBe(403)
  })

  it('returns 409 when accepting a non-pending challenge', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: guestOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: matchId,
      organizationId: hostOrgId,
      guestOrganizationId: guestOrgId,
      challengeStatus: ChallengeStatus.ACCEPTED,
    } as never)

    const response = await acceptChallenge(new Request('http://localhost'), {
      params: Promise.resolve({ id: matchId }),
    })

    expect(response.status).toBe(409)
  })

  it('host can cancel a pending challenge', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: hostOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: matchId,
      organizationId: hostOrgId,
      challengeStatus: ChallengeStatus.PENDING,
    } as never)
    vi.mocked(db.match.update).mockResolvedValue({
      id: matchId,
      challengeStatus: ChallengeStatus.CANCELLED,
    } as never)

    const response = await cancelChallenge(new Request('http://localhost'), {
      params: Promise.resolve({ id: matchId }),
    })

    expect(response.status).toBe(200)
  })

  it('guest can decline a pending challenge', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: guestOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: matchId,
      guestOrganizationId: guestOrgId,
      challengeStatus: ChallengeStatus.PENDING,
    } as never)
    vi.mocked(db.match.update).mockResolvedValue({
      id: matchId,
      challengeStatus: ChallengeStatus.DECLINED,
    } as never)

    const response = await declineChallenge(new Request('http://localhost'), {
      params: Promise.resolve({ id: matchId }),
    })

    expect(response.status).toBe(200)
  })
})
