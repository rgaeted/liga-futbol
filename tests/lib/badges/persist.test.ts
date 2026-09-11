import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUnique: vi.fn(), update: vi.fn() },
    orgBadge: { count: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    playerBadge: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    match: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { seedOrgBadgeCatalog, setOrgBadgesEnabled, syncBadgesForFinishedMatch } from '@/lib/badges/persist'

describe('seedOrgBadgeCatalog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts 34 rows when empty', async () => {
    vi.mocked(db.orgBadge.count).mockResolvedValue(0)
    vi.mocked(db.orgBadge.createMany).mockResolvedValue({ count: 34 })
    await seedOrgBadgeCatalog('org1')
    expect(db.orgBadge.createMany).toHaveBeenCalled()
    const args = vi.mocked(db.orgBadge.createMany).mock.calls[0]![0] as { data: unknown[] }
    expect(args.data).toHaveLength(34)
  })

  it('skips when catalog exists', async () => {
    vi.mocked(db.orgBadge.count).mockResolvedValue(10)
    await seedOrgBadgeCatalog('org1')
    expect(db.orgBadge.createMany).not.toHaveBeenCalled()
  })
})

describe('syncBadgesForFinishedMatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns immediately when badges are disabled', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      organization: { badgesEnabled: false },
      status: 'FINISHED',
    } as never)

    await syncBadgesForFinishedMatch('m1')

    expect(db.playerBadge.deleteMany).not.toHaveBeenCalled()
    expect(db.orgBadge.findMany).not.toHaveBeenCalled()
  })

  it('returns immediately when the match is not finished', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      organization: { badgesEnabled: true },
      status: 'SCHEDULED',
    } as never)

    await syncBadgesForFinishedMatch('m1')

    expect(db.playerBadge.deleteMany).not.toHaveBeenCalled()
    expect(db.orgBadge.findMany).not.toHaveBeenCalled()
  })
})

describe('setOrgBadgesEnabled', () => {
  beforeEach(() => vi.clearAllMocks())

  it('seeds and backfills when enabling badges', async () => {
    vi.mocked(db.organization.update).mockResolvedValue({} as never)
    vi.mocked(db.orgBadge.count).mockResolvedValue(0)
    vi.mocked(db.orgBadge.createMany).mockResolvedValue({ count: 34 })
    vi.mocked(db.match.findMany).mockResolvedValue([])

    await setOrgBadgesEnabled('org1', true)

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: 'org1' },
      data: { badgesEnabled: true },
    })
    expect(db.orgBadge.createMany).toHaveBeenCalled()
    expect(db.match.findMany).toHaveBeenCalled()
  })

  it('does not backfill when disabling badges', async () => {
    vi.mocked(db.organization.update).mockResolvedValue({} as never)

    await setOrgBadgesEnabled('org1', false)

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: 'org1' },
      data: { badgesEnabled: false },
    })
    expect(db.orgBadge.count).not.toHaveBeenCalled()
    expect(db.match.findMany).not.toHaveBeenCalled()
  })
})
