import {
  MobileInstallationStatus,
  NotificationDeliveryStatus,
  NotificationKind,
  NotificationOutboxStatus,
} from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeOutboxNextRetryAt,
  computeOutboxRetryDelayMs,
  processOutboxItem,
  processPendingNotifications,
} from '@/lib/mobile/notifications/process-outbox'

vi.mock('@/lib/mobile/notifications/claim-outbox', () => ({
  claimPendingOutbox: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/recipients', () => ({
  findSubscribedInstallations: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/expo-push', () => ({
  sendExpoPush: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    match: { findUnique: vi.fn() },
    seasonTeam: { findMany: vi.fn() },
    notificationDelivery: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notificationOutbox: {
      update: vi.fn(),
    },
    mobileInstallation: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { claimPendingOutbox } from '@/lib/mobile/notifications/claim-outbox'
import { sendExpoPush } from '@/lib/mobile/notifications/expo-push'
import { findSubscribedInstallations } from '@/lib/mobile/notifications/recipients'
import { db } from '@/lib/db'

const baseOutbox = {
  id: 'outbox-1',
  seasonId: 'season-1',
  matchId: 'match-1',
  kind: NotificationKind.GOAL,
  seasonTeamId: 'st-home',
  matchEventId: 'event-1',
  payload: {
    title: '¡Gol!',
    body: 'Rojo 1-0 Negro',
    data: {
      type: 'match',
      slug: 'demo-liga',
      matchId: 'match-1',
      kind: 'GOAL',
      path: '/matches/match-1',
    },
  },
  status: NotificationOutboxStatus.PROCESSING,
  dedupeKey: 'goal:season-1:match-1:event-1',
  attempts: 0,
  nextRetryAt: null,
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('outbox retry schedule', () => {
  it('uses exponential backoff capped at one hour', () => {
    expect(computeOutboxRetryDelayMs(1)).toBe(60_000)
    expect(computeOutboxRetryDelayMs(3)).toBe(240_000)
    expect(computeOutboxRetryDelayMs(10)).toBe(3_600_000)
  })

  it('computes the next retry timestamp from attempts', () => {
    const now = new Date('2026-08-12T12:00:00.000Z')
    expect(computeOutboxNextRetryAt(2, now).toISOString()).toBe('2026-08-12T12:02:00.000Z')
  })
})

describe('processOutboxItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (operations: unknown) => {
      if (typeof operations === 'function') {
        return (operations as (client: typeof db) => Promise<unknown>)(db)
      }
      const batch = operations as Array<Promise<unknown>>
      for (const operation of batch) {
        await operation
      }
      return undefined
    })
  })

  it('marks outbox sent when there are no recipients', async () => {
    vi.mocked(findSubscribedInstallations).mockResolvedValue([])

    await processOutboxItem(baseOutbox as never)

    expect(db.notificationDelivery.createMany).not.toHaveBeenCalled()
    expect(db.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        status: NotificationOutboxStatus.SENT,
        lastError: null,
        nextRetryAt: null,
      },
    })
    expect(sendExpoPush).not.toHaveBeenCalled()
  })

  it('creates one delivery per installation and sends only pending rows', async () => {
    vi.mocked(findSubscribedInstallations).mockResolvedValue([
      { installationId: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
    ])
    vi.mocked(db.notificationDelivery.createMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.notificationDelivery.findMany)
      .mockResolvedValueOnce([
        {
          id: 'delivery-1',
          installationId: 'inst-1',
          installation: { expoPushToken: 'ExpoPushToken[a]' },
        },
      ] as never)
      .mockResolvedValueOnce([] as never)
    vi.mocked(sendExpoPush).mockResolvedValue([{ status: 'ok', id: 'ticket-1' }])

    await processOutboxItem(baseOutbox as never)
    await processOutboxItem(baseOutbox as never)

    expect(db.notificationDelivery.createMany).toHaveBeenCalledTimes(2)
    expect(sendExpoPush).toHaveBeenCalledTimes(1)
    expect(db.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: {
        status: NotificationDeliveryStatus.SENT,
        expoTicketId: 'ticket-1',
        lastError: null,
      },
    })
  })

  it('schedules retry after transient Expo HTTP failures', async () => {
    vi.mocked(findSubscribedInstallations).mockResolvedValue([
      { installationId: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
    ])
    vi.mocked(db.notificationDelivery.createMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.notificationDelivery.findMany).mockResolvedValue([
      {
        id: 'delivery-1',
        installationId: 'inst-1',
        installation: { expoPushToken: 'ExpoPushToken[a]' },
      },
    ] as never)
    vi.mocked(sendExpoPush).mockRejectedValue(new Error('Expo push HTTP 503'))

    const now = new Date('2026-08-12T12:00:00.000Z')
    await processOutboxItem(baseOutbox as never, now)

    expect(db.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        status: NotificationOutboxStatus.FAILED,
        attempts: 1,
        lastError: 'Expo push HTTP 503',
        nextRetryAt: computeOutboxNextRetryAt(1, now),
      },
    })
  })

  it('deactivates invalid tokens and continues other recipients', async () => {
    vi.mocked(findSubscribedInstallations).mockResolvedValue([
      { installationId: 'inst-1', expoPushToken: 'ExpoPushToken[bad]' },
      { installationId: 'inst-2', expoPushToken: 'ExpoPushToken[good]' },
    ])
    vi.mocked(db.notificationDelivery.createMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(db.notificationDelivery.findMany).mockResolvedValue([
      {
        id: 'delivery-1',
        installationId: 'inst-1',
        installation: { expoPushToken: 'ExpoPushToken[bad]' },
      },
      {
        id: 'delivery-2',
        installationId: 'inst-2',
        installation: { expoPushToken: 'ExpoPushToken[good]' },
      },
    ] as never)
    vi.mocked(sendExpoPush).mockResolvedValue([
      {
        status: 'error',
        message: 'DeviceNotRegistered',
        details: { error: 'DeviceNotRegistered' },
      },
      { status: 'ok', id: 'ticket-2' },
    ])

    await processOutboxItem(baseOutbox as never)

    expect(db.$transaction).toHaveBeenCalled()
    expect(db.mobileInstallation.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: { status: MobileInstallationStatus.INACTIVE },
    })
    expect(db.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        status: NotificationOutboxStatus.SENT,
        lastError: null,
        nextRetryAt: null,
      },
    })
  })
})

describe('processPendingNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('processes claimed outbox rows', async () => {
    vi.mocked(claimPendingOutbox).mockResolvedValue([baseOutbox as never])
    vi.mocked(findSubscribedInstallations).mockResolvedValue([])

    const result = await processPendingNotifications({ limit: 5 })

    expect(claimPendingOutbox).toHaveBeenCalledWith(5, expect.any(Date))
    expect(result).toEqual({ processed: 1 })
  })
})
