import {
  MobileInstallationStatus,
  NotificationKind,
} from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findSubscribedInstallations } from '@/lib/mobile/notifications/recipients'

vi.mock('@/lib/db', () => ({
  db: {
    teamSubscription: {
      findMany: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('findSubscribedInstallations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns active installations subscribed to the requested teams', async () => {
    vi.mocked(db.teamSubscription.findMany).mockResolvedValue([
      {
        installationId: 'inst-1',
        installation: { id: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
      },
    ] as never)

    const recipients = await findSubscribedInstallations({
      seasonId: 'season-1',
      seasonTeamIds: ['st-home'],
      kind: NotificationKind.GOAL,
    })

    expect(recipients).toEqual([
      { installationId: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
    ])
    expect(db.teamSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          seasonTeamId: { in: ['st-home'] },
          notifyGoals: true,
          installation: {
            seasonId: 'season-1',
            status: MobileInstallationStatus.ACTIVE,
          },
        }),
      }),
    )
  })

  it('filters by match start preference', async () => {
    vi.mocked(db.teamSubscription.findMany).mockResolvedValue([])

    await findSubscribedInstallations({
      seasonId: 'season-1',
      seasonTeamIds: ['st-home', 'st-away'],
      kind: NotificationKind.MATCH_START,
    })

    expect(db.teamSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ notifyMatchStart: true }),
      }),
    )
  })

  it('filters by final preference', async () => {
    vi.mocked(db.teamSubscription.findMany).mockResolvedValue([])

    await findSubscribedInstallations({
      seasonId: 'season-1',
      seasonTeamIds: ['st-home'],
      kind: NotificationKind.MATCH_FINISH,
    })

    expect(db.teamSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ notifyFinal: true }),
      }),
    )
  })

  it('deduplicates installations subscribed to multiple teams', async () => {
    vi.mocked(db.teamSubscription.findMany).mockResolvedValue([
      {
        installationId: 'inst-1',
        installation: { id: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
      },
      {
        installationId: 'inst-1',
        installation: { id: 'inst-1', expoPushToken: 'ExpoPushToken[a]' },
      },
    ] as never)

    const recipients = await findSubscribedInstallations({
      seasonId: 'season-1',
      seasonTeamIds: ['st-home', 'st-away'],
      kind: NotificationKind.MATCH_START,
    })

    expect(recipients).toHaveLength(1)
  })

  it('returns an empty list when no team ids are provided', async () => {
    const recipients = await findSubscribedInstallations({
      seasonId: 'season-1',
      seasonTeamIds: [],
      kind: NotificationKind.GOAL,
    })
    expect(recipients).toEqual([])
    expect(db.teamSubscription.findMany).not.toHaveBeenCalled()
  })
})
