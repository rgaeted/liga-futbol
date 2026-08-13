import { EventType, MatchStatus, MatchType, NotificationKind } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerMatchEvent } from '@/lib/match-events'

vi.mock('@/lib/db', () => ({
  db: {
    match: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    matchEvent: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/match-clock', () => ({
  getMatchMinute: vi.fn().mockReturnValue(12),
}))

vi.mock('@/lib/match-reconcile', () => ({
  syncLeaguePlayerStats: vi.fn(),
}))

vi.mock('@/lib/supabase-realtime-server', () => ({
  publishMatchInvalidation: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/enqueue', () => ({
  safeEnqueueMatchNotification: vi.fn(),
}))

import { db } from '@/lib/db'
import { safeEnqueueMatchNotification } from '@/lib/mobile/notifications/enqueue'

const baseMatch = {
  id: 'match-1',
  matchType: MatchType.LEAGUE,
  seasonId: 'season-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  homeScore: 0,
  awayScore: 0,
  status: MatchStatus.SCHEDULED,
  clockStartedAt: null,
  secondHalfStartedAt: null,
  halftimeAt: null,
}

describe('registerMatchEvent notifications', () => {
  beforeEach(() => vi.clearAllMocks())

  function mockUpdatedMatch(overrides: Record<string, unknown> = {}) {
    const updated = { ...baseMatch, ...overrides }
    vi.mocked(db.match.update).mockResolvedValue(updated as never)
    return updated
  }

  it('enqueues match start on first-half kickoff', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue(baseMatch as never)
    vi.mocked(db.matchEvent.create).mockResolvedValue({ id: 'event-1', player: null } as never)
    const updated = mockUpdatedMatch({ status: MatchStatus.LIVE })

    await registerMatchEvent('match-1', { type: EventType.KICKOFF })

    expect(safeEnqueueMatchNotification).toHaveBeenCalledWith({
      kind: NotificationKind.MATCH_START,
      match: updated,
    })
  })

  it('does not enqueue on second-half kickoff', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue({
      ...baseMatch,
      status: MatchStatus.HALFTIME,
    } as never)
    vi.mocked(db.matchEvent.create).mockResolvedValue({ id: 'event-2', player: null } as never)
    mockUpdatedMatch({ status: MatchStatus.LIVE })

    await registerMatchEvent('match-1', { type: EventType.KICKOFF })

    expect(safeEnqueueMatchNotification).not.toHaveBeenCalled()
  })

  it('enqueues goals and fulltime', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue({
      ...baseMatch,
      status: MatchStatus.LIVE,
    } as never)
    vi.mocked(db.matchEvent.create).mockResolvedValue({
      id: 'event-goal',
      player: { user: { name: 'Juan' } },
    } as never)
    const updated = mockUpdatedMatch({ homeScore: 1 })

    await registerMatchEvent('match-1', {
      type: EventType.GOAL,
      teamId: 'team-home',
      playerId: 'player-1',
    })

    expect(safeEnqueueMatchNotification).toHaveBeenCalledWith({
      kind: NotificationKind.GOAL,
      match: updated,
      matchEvent: {
        id: 'event-goal',
        type: EventType.GOAL,
        teamId: 'team-home',
        playerName: 'Juan',
      },
    })

    vi.mocked(db.matchEvent.create).mockResolvedValue({ id: 'event-ft', player: null } as never)
    mockUpdatedMatch({ status: MatchStatus.FINISHED })

    await registerMatchEvent('match-1', { type: EventType.FULLTIME })

    expect(safeEnqueueMatchNotification).toHaveBeenLastCalledWith({
      kind: NotificationKind.MATCH_FINISH,
      match: expect.objectContaining({ status: MatchStatus.FINISHED }),
    })
  })

  it('does not enqueue halftime events', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue({
      ...baseMatch,
      status: MatchStatus.LIVE,
    } as never)
    vi.mocked(db.matchEvent.create).mockResolvedValue({ id: 'event-ht', player: null } as never)
    mockUpdatedMatch({ status: MatchStatus.HALFTIME })

    await registerMatchEvent('match-1', { type: EventType.HALFTIME })

    expect(safeEnqueueMatchNotification).not.toHaveBeenCalled()
  })

  it('still returns the persisted event after enqueue attempt', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue(baseMatch as never)
    vi.mocked(db.matchEvent.create).mockResolvedValue({ id: 'event-1', player: null } as never)
    mockUpdatedMatch({ status: MatchStatus.LIVE })
    vi.mocked(safeEnqueueMatchNotification).mockResolvedValue(undefined)

    const result = await registerMatchEvent('match-1', { type: EventType.KICKOFF })

    expect(result.event.id).toBe('event-1')
    expect(safeEnqueueMatchNotification).toHaveBeenCalled()
  })
})
