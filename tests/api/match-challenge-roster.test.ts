import { ChallengeStatus, MatchStatus, MatchType } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/matches/[id]/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/enqueue', () => ({
  safeEnqueueMatchNotification: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    match: { findUnique: vi.fn(), update: vi.fn() },
    friendlyPlayer: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'

const hostOrgId = 'org-host'
const guestOrgId = 'org-guest'
const matchId = 'match-1'

const baseChallengeMatch = {
  id: matchId,
  organizationId: hostOrgId,
  guestOrganizationId: guestOrgId,
  challengeStatus: ChallengeStatus.ACCEPTED,
  matchType: MatchType.FRIENDLY,
  status: MatchStatus.SCHEDULED,
  seasonId: null,
  homeTeamId: null,
  awayTeamId: null,
  homeScore: 0,
  awayScore: 0,
  friendlyCategoryId: 'cat-1',
  regionCode: null,
  communeCode: null,
  scheduledAt: new Date('2026-08-20T20:00:00.000Z'),
  friendlyPlayers: [
    {
      playerId: 'fp-host',
      side: 'A' as const,
      isCaptain: true,
      isCoach: true,
    },
  ],
}

describe('challenge roster guards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks host from writing side B players', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: hostOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue(baseChallengeMatch as never)

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: [
            { playerId: 'fp-host', side: 'A', isCaptain: true, isCoach: true },
            { playerId: 'fp-guest', side: 'B', isCaptain: true, isCoach: true },
          ],
        }),
      }),
      { params: Promise.resolve({ id: matchId }) }
    )

    expect(response.status).toBe(403)
  })

  it('blocks LIVE while challenge is PENDING', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: hostOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue({
      ...baseChallengeMatch,
      challengeStatus: ChallengeStatus.PENDING,
      friendlyPlayers: [
        {
          playerId: 'fp-host',
          side: 'A',
          isCaptain: true,
          isCoach: true,
        },
      ],
    } as never)

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE' }),
      }),
      { params: Promise.resolve({ id: matchId }) }
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/aceptado/)
  })

  it('allows guest to write side B players only', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: guestOrgId,
      role: 'ORG_ADMIN',
      session: {} as never,
    })
    vi.mocked(db.match.findUnique).mockResolvedValue(baseChallengeMatch as never)
    vi.mocked(db.friendlyPlayer.findMany).mockResolvedValue([
      {
        id: 'fp-host',
        organizationId: hostOrgId,
        categories: [{ friendlyCategoryId: 'cat-1' }],
      },
      {
        id: 'fp-guest',
        organizationId: guestOrgId,
        categories: [{ friendlyCategoryId: 'cat-1' }],
      },
    ] as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        friendlyMatchPlayer: {
          findMany: vi.fn().mockResolvedValue([]),
          delete: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
        friendlyPlayer: {
          findUnique: vi.fn().mockResolvedValue({
            organizationId: guestOrgId,
            person: { userId: null },
          }),
        },
        organizationMembership: { updateMany: vi.fn() },
        matchEvent: { updateMany: vi.fn() },
        match: {
          update: vi.fn().mockResolvedValue({
            ...baseChallengeMatch,
            matchType: MatchType.FRIENDLY,
          }),
        },
      } as never)
    )

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: [
            { playerId: 'fp-guest', side: 'B', isCaptain: true, isCoach: true },
          ],
        }),
      }),
      { params: Promise.resolve({ id: matchId }) }
    )

    expect(response.status).toBe(200)
  })
})
