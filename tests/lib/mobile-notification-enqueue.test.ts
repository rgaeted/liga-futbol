import {
  EventType,
  MatchType,
  NotificationKind,
  Prisma,
} from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enqueueMatchNotification,
  safeEnqueueMatchNotification,
} from '@/lib/mobile/notifications/enqueue'

vi.mock('@/lib/db', () => ({
  db: {
    season: {
      findUnique: vi.fn(),
    },
    notificationOutbox: {
      create: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

const leagueMatch = {
  id: 'match-1',
  matchType: MatchType.LEAGUE,
  seasonId: 'season-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  homeScore: 1,
  awayScore: 0,
}

const publishedSeason = {
  mobileConfig: { isPublished: true, slug: 'demo-liga' },
  seasonTeams: [
    { id: 'st-home', teamId: 'team-home', displayName: 'Rojo' },
    { id: 'st-away', teamId: 'team-away', displayName: 'Negro' },
  ],
}

describe('enqueueMatchNotification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ignores friendly matches', async () => {
    const result = await enqueueMatchNotification({
      kind: NotificationKind.MATCH_START,
      match: { ...leagueMatch, matchType: MatchType.FRIENDLY },
    })
    expect(result).toEqual({ enqueued: false })
    expect(db.season.findUnique).not.toHaveBeenCalled()
  })

  it('ignores unpublished editions', async () => {
    vi.mocked(db.season.findUnique).mockResolvedValue({
      mobileConfig: { isPublished: false, slug: 'demo-liga' },
      seasonTeams: publishedSeason.seasonTeams,
    } as never)

    const result = await enqueueMatchNotification({
      kind: NotificationKind.MATCH_START,
      match: leagueMatch,
    })
    expect(result).toEqual({ enqueued: false })
  })

  it('creates a goal outbox row for the scoring team', async () => {
    vi.mocked(db.season.findUnique).mockResolvedValue(publishedSeason as never)
    vi.mocked(db.notificationOutbox.create).mockResolvedValue({ id: 'outbox-1' } as never)

    const result = await enqueueMatchNotification({
      kind: NotificationKind.GOAL,
      match: leagueMatch,
      matchEvent: {
        id: 'event-1',
        type: EventType.GOAL,
        teamId: 'team-home',
        playerName: 'Juan',
      },
    })

    expect(result).toEqual({ enqueued: true, outboxId: 'outbox-1' })
    expect(db.notificationOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seasonTeamId: 'st-home',
          matchEventId: 'event-1',
          dedupeKey: 'goal:season-1:match-1:event-1',
        }),
      }),
    )
  })

  it('returns enqueued false on duplicate dedupe keys', async () => {
    vi.mocked(db.season.findUnique).mockResolvedValue(publishedSeason as never)
    vi.mocked(db.notificationOutbox.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )

    const result = await enqueueMatchNotification({
      kind: NotificationKind.MATCH_START,
      match: leagueMatch,
    })
    expect(result).toEqual({ enqueued: false })
  })

  it('skips goals when enrollment is missing', async () => {
    vi.mocked(db.season.findUnique).mockResolvedValue({
      mobileConfig: { isPublished: true, slug: 'demo-liga' },
      seasonTeams: [{ id: 'st-home', teamId: 'team-home', displayName: 'Rojo' }],
    } as never)

    const result = await enqueueMatchNotification({
      kind: NotificationKind.GOAL,
      match: leagueMatch,
      matchEvent: {
        id: 'event-1',
        type: EventType.GOAL,
        teamId: 'team-home',
      },
    })
    expect(result).toEqual({ enqueued: false })
  })

  it('swallows enqueue failures without throwing', async () => {
    vi.mocked(db.season.findUnique).mockRejectedValue(new Error('db unavailable'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(
      safeEnqueueMatchNotification({
        kind: NotificationKind.MATCH_START,
        match: leagueMatch,
      }),
    ).resolves.toBeUndefined()

    expect(warnSpy).toHaveBeenCalledWith(
      'mobile_notification_enqueue_failed',
      expect.objectContaining({ matchId: 'match-1', kind: NotificationKind.MATCH_START }),
    )
  })
})
