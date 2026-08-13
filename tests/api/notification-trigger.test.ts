import { EventType, MatchStatus, MatchType, Role } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  processPendingNotifications: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: mocks.after,
  }
})

vi.mock('@/lib/mobile/notifications/process-outbox', () => ({
  processPendingNotifications: mocks.processPendingNotifications,
}))

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    match: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/match-events', () => ({
  registerMatchEvent: vi.fn(),
  GAME_EVENT_TYPES: [EventType.GOAL],
}))

vi.mock('@/lib/match-referee-events', () => ({
  isRefereeEventEnabled: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/mobile/notifications/enqueue', () => ({
  safeEnqueueMatchNotification: vi.fn(),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { registerMatchEvent } from '@/lib/match-events'
import { POST as postMatchEvent } from '@/app/api/matches/[id]/events/route'
import { PUT as putMatch } from '@/app/api/matches/[id]/route'
import { triggerNotificationProcessing } from '@/lib/mobile/notifications/trigger-process'

describe('triggerNotificationProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('schedules processing after the response via after()', async () => {
    mocks.processPendingNotifications.mockResolvedValue({ processed: 1 })

    triggerNotificationProcessing()

    expect(mocks.after).toHaveBeenCalledOnce()
    await mocks.after.mock.calls[0][0]()
    expect(mocks.processPendingNotifications).toHaveBeenCalledWith({ limit: 5 })
  })

  it('swallows processor errors inside after()', async () => {
    mocks.processPendingNotifications.mockRejectedValue(new Error('processor failed'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    triggerNotificationProcessing()

    const afterCallback = mocks.after.mock.calls[0]?.[0]
    expect(afterCallback).toBeTypeOf('function')
    await afterCallback()

    expect(warnSpy).toHaveBeenCalledWith(
      'mobile_notification_process_failed',
      expect.objectContaining({ reason: 'Error' }),
    )
  })
})

describe('match mutation triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN },
    } as never)
  })

  it('schedules notification processing after a successful league event POST', async () => {
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue({
      id: 'match-1',
      matchType: MatchType.LEAGUE,
      refereeId: 'admin-1',
      refereeEventTypes: [EventType.GOAL],
      status: MatchStatus.LIVE,
    } as never)
    vi.mocked(registerMatchEvent).mockResolvedValue({
      event: { id: 'event-1' },
      match: { id: 'match-1', matchType: MatchType.LEAGUE },
    } as never)

    const response = await postMatchEvent(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: EventType.GOAL, teamId: 'team-1', playerId: 'player-1' }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) },
    )

    expect(response.status).toBe(201)
    expect(mocks.after).toHaveBeenCalled()
  })

  it('does not schedule processing when event POST is rejected', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      user: { id: 'ref-1', role: Role.REFEREE },
    } as never)
    vi.mocked(db.match.findUniqueOrThrow).mockResolvedValue({
      id: 'match-1',
      matchType: MatchType.LEAGUE,
      refereeId: 'ref-1',
      refereeEventTypes: [EventType.GOAL],
      status: MatchStatus.SCHEDULED,
    } as never)

    const response = await postMatchEvent(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: EventType.GOAL, teamId: 'team-1', playerId: 'player-1' }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) },
    )

    expect(response.status).toBe(400)
    expect(mocks.after).not.toHaveBeenCalled()
  })

  it('schedules notification processing after a successful league match PUT', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: 'match-1',
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
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        match: {
          update: vi.fn().mockResolvedValue({
            id: 'match-1',
            matchType: MatchType.LEAGUE,
            status: MatchStatus.LIVE,
            seasonId: 'season-1',
          }),
        },
      } as never),
    )

    const response = await putMatch(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE' }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.after).toHaveBeenCalled()
  })
})
