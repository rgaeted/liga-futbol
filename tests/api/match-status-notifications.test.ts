import { MatchStatus, MatchType, NotificationKind } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/matches/[id]/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org-host' }),
}))

vi.mock('@/lib/mobile/notifications/enqueue', () => ({
  safeEnqueueMatchNotification: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/trigger-process', () => ({
  triggerNotificationProcessing: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import { safeEnqueueMatchNotification } from '@/lib/mobile/notifications/enqueue'

const existingMatch = {
  id: 'match-1',
  organizationId: 'org-host',
  guestOrganizationId: null,
  challengeStatus: 'NONE',
  matchType: MatchType.LEAGUE,
  status: MatchStatus.SCHEDULED,
  seasonId: 'season-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  homeScore: 0,
  awayScore: 0,
  friendlyCategoryId: null,
  regionCode: null,
  communeCode: null,
  scheduledAt: new Date('2026-08-20T20:00:00.000Z'),
  friendlyPlayers: [],
}

describe('PUT /api/matches/[id] notifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('enqueues match start when admin sets status to LIVE', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue(existingMatch as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        match: {
          update: vi.fn().mockResolvedValue({
            ...existingMatch,
            status: MatchStatus.LIVE,
          }),
        },
      } as never),
    )

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE' }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) },
    )

    expect(response.status).toBe(200)
    expect(safeEnqueueMatchNotification).toHaveBeenCalledWith({
      kind: NotificationKind.MATCH_START,
      match: expect.objectContaining({ status: MatchStatus.LIVE }),
    })
  })

  it('enqueues match finish when admin sets status to FINISHED', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      ...existingMatch,
      status: MatchStatus.LIVE,
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        match: {
          update: vi.fn().mockResolvedValue({
            ...existingMatch,
            status: MatchStatus.FINISHED,
            homeScore: 2,
            awayScore: 1,
          }),
        },
      } as never),
    )

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINISHED' }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) },
    )

    expect(response.status).toBe(200)
    expect(safeEnqueueMatchNotification).toHaveBeenCalledWith({
      kind: NotificationKind.MATCH_FINISH,
      match: expect.objectContaining({ status: MatchStatus.FINISHED }),
    })
  })
})
