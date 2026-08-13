import { MobileInstallationStatus, MobilePlatform } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deactivateInstallation } from '@/lib/mobile/installations/deactivate'
import { registerInstallation } from '@/lib/mobile/installations/register'
import {
  checkInstallationRateLimit,
  resetInstallationRateLimitForTests,
} from '@/lib/mobile/installations/rate-limit'
import { replaceTeamSubscriptions } from '@/lib/mobile/installations/subscriptions'

const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    mobileInstallation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    seasonTeam: {
      count: vi.fn(),
    },
    teamSubscription: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => mockTransaction(callback),
  },
}))

import { db } from '@/lib/db'

describe('registerInstallation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a new active installation', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue(null)
    vi.mocked(db.mobileInstallation.upsert).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: MobileInstallationStatus.ACTIVE,
    } as never)

    const now = new Date('2026-08-12T12:00:00.000Z')
    const result = await registerInstallation({
      seasonId: 'season-1',
      installationId: '11111111-1111-4111-8111-111111111111',
      expoPushToken: 'ExpoPushToken[abc]',
      platform: MobilePlatform.IOS,
      appVersion: '1.0.0',
      now,
    })

    expect(result).toEqual({
      installationId: '11111111-1111-4111-8111-111111111111',
      status: 'ACTIVE',
    })
    expect(db.mobileInstallation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          seasonId: 'season-1',
          status: MobileInstallationStatus.ACTIVE,
          lastSeenAt: now,
        }),
      }),
    )
  })

  it('reactivates an inactive installation and updates token metadata', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      seasonId: 'season-1',
      status: MobileInstallationStatus.INACTIVE,
    } as never)
    vi.mocked(db.mobileInstallation.upsert).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: MobileInstallationStatus.ACTIVE,
    } as never)

    const now = new Date('2026-08-12T13:00:00.000Z')
    await registerInstallation({
      seasonId: 'season-1',
      installationId: '11111111-1111-4111-8111-111111111111',
      expoPushToken: 'ExponentPushToken[new]',
      platform: MobilePlatform.ANDROID,
      appVersion: '1.1.0',
      now,
    })

    expect(db.mobileInstallation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          expoPushToken: 'ExponentPushToken[new]',
          appVersion: '1.1.0',
          status: MobileInstallationStatus.ACTIVE,
          lastSeenAt: now,
        }),
      }),
    )
  })

  it('rejects reuse of an installation id under another season', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      seasonId: 'season-other',
      status: MobileInstallationStatus.ACTIVE,
    } as never)

    await expect(
      registerInstallation({
        seasonId: 'season-1',
        installationId: '11111111-1111-4111-8111-111111111111',
        expoPushToken: 'ExpoPushToken[abc]',
        platform: MobilePlatform.IOS,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('replaceTeamSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        teamSubscription: {
          deleteMany: db.teamSubscription.deleteMany,
          createMany: db.teamSubscription.createMany,
        },
      }),
    )
  })

  it('rejects a seasonTeamId from another season', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: 'i1',
      seasonId: 's1',
      status: MobileInstallationStatus.ACTIVE,
    } as never)
    vi.mocked(db.seasonTeam.count).mockResolvedValue(1)

    await expect(
      replaceTeamSubscriptions({
        seasonId: 's1',
        installationId: 'i1',
        teams: [{ seasonTeamId: 'st1' }, { seasonTeamId: 'st-other' }],
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('replaces subscriptions transactionally with defaults', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: 'i1',
      seasonId: 's1',
      status: MobileInstallationStatus.ACTIVE,
    } as never)
    vi.mocked(db.seasonTeam.count).mockResolvedValue(1)

    const result = await replaceTeamSubscriptions({
      seasonId: 's1',
      installationId: 'i1',
      teams: [{ seasonTeamId: 'st1', notifyGoals: false }],
    })

    expect(db.teamSubscription.deleteMany).toHaveBeenCalledWith({
      where: { installationId: 'i1' },
    })
    expect(db.teamSubscription.createMany).toHaveBeenCalledWith({
      data: [
        {
          installationId: 'i1',
          seasonTeamId: 'st1',
          notifyMatchStart: true,
          notifyGoals: false,
          notifyFinal: true,
        },
      ],
    })
    expect(result.teams).toEqual([
      {
        seasonTeamId: 'st1',
        notifyMatchStart: true,
        notifyGoals: false,
        notifyFinal: true,
      },
    ])
  })

  it('returns 404 when installation belongs to another season', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: 'i1',
      seasonId: 'other',
      status: MobileInstallationStatus.ACTIVE,
    } as never)

    await expect(
      replaceTeamSubscriptions({
        seasonId: 's1',
        installationId: 'i1',
        teams: [],
      }),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('deactivateInstallation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks an installation inactive', async () => {
    vi.mocked(db.mobileInstallation.findUnique).mockResolvedValue({
      id: 'i1',
      seasonId: 's1',
      status: MobileInstallationStatus.ACTIVE,
    } as never)

    await deactivateInstallation('s1', 'i1')

    expect(db.mobileInstallation.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { status: MobileInstallationStatus.INACTIVE },
    })
  })
})

describe('checkInstallationRateLimit', () => {
  beforeEach(() => resetInstallationRateLimitForTests())

  it('allows up to ten requests per minute', () => {
    const key = 'liga-demo:127.0.0.1:register'
    const now = Date.UTC(2026, 7, 12, 12, 0, 0)
    for (let index = 0; index < 10; index += 1) {
      expect(() => checkInstallationRateLimit(key, now + index)).not.toThrow()
    }
    expect(() => checkInstallationRateLimit(key, now + 10)).toThrowError(
      expect.objectContaining({ status: 429 }),
    )
  })
})
