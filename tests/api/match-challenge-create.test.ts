import { ChallengeStatus, MatchType } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/matches/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    friendlyCategory: { findUnique: vi.fn() },
    friendlyPlayer: { findMany: vi.fn() },
    organization: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'

const hostOrgId = 'org-host'
const guestOrgId = 'org-guest'

describe('POST /api/matches challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: hostOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
  })

  it('creates a PENDING challenge with side A players only', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: guestOrgId,
      name: 'Otra Liga',
      status: 'ACTIVE',
      slug: 'other',
    } as never)
    vi.mocked(db.friendlyCategory.findUnique).mockResolvedValue({
      id: 'cat-1',
      organizationId: hostOrgId,
      isActive: true,
    } as never)
    vi.mocked(db.friendlyPlayer.findMany).mockResolvedValue([
      {
        id: 'fp-1',
        organizationId: hostOrgId,
        categories: [{ friendlyCategoryId: 'cat-1' }],
      },
    ] as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        match: {
          create: vi.fn().mockResolvedValue({ id: 'match-1' }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'match-1',
            matchType: MatchType.FRIENDLY,
            challengeStatus: ChallengeStatus.PENDING,
            guestOrganizationId: guestOrgId,
            organizationId: hostOrgId,
            friendlyPlayers: [
              {
                side: 'A',
                friendlyPlayerId: 'fp-1',
                friendlyPlayer: { id: 'fp-1', firstName: 'Juan', lastName: 'Pérez' },
              },
            ],
          }),
        },
        friendlyMatchPlayer: { createMany: vi.fn() },
      } as never)
    )

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchType: 'FRIENDLY',
          guestOrganizationSlug: 'other',
          friendlyCategoryId: 'cat-1',
          sideAName: 'Kelme',
          scheduledAt: new Date().toISOString(),
          players: [
            { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
          ],
        }),
      })
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.challengeStatus).toBe(ChallengeStatus.PENDING)
    expect(body.guestOrganizationId).toBe(guestOrgId)
    expect(body.friendlyPlayers.every((player: { side: string }) => player.side === 'A')).toBe(
      true
    )
  })

  it('returns 400 for invalid guest slug', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchType: 'FRIENDLY',
          guestOrganizationSlug: 'missing',
          friendlyCategoryId: 'cat-1',
          sideAName: 'Kelme',
          scheduledAt: new Date().toISOString(),
          players: [
            { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
          ],
        }),
      })
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 for paused guest organization', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: guestOrgId,
      name: 'Pausada',
      status: 'PAUSED',
      slug: 'paused',
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchType: 'FRIENDLY',
          guestOrganizationSlug: 'paused',
          friendlyCategoryId: 'cat-1',
          sideAName: 'Kelme',
          scheduledAt: new Date().toISOString(),
          players: [
            { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
          ],
        }),
      })
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 when challenging the same organization', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: hostOrgId,
      name: 'Kelme',
      status: 'ACTIVE',
      slug: 'kelme',
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchType: 'FRIENDLY',
          guestOrganizationSlug: 'kelme',
          friendlyCategoryId: 'cat-1',
          sideAName: 'Kelme',
          scheduledAt: new Date().toISOString(),
          players: [
            { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
          ],
        }),
      })
    )

    expect(response.status).toBe(400)
  })
})
