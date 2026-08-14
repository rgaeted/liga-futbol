import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationStatus } from '@prisma/client'
import { MobileApiError } from '@/lib/mobile/errors'
import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'

vi.mock('@/lib/db', () => ({
  db: {
    seasonMobileConfig: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('resolvePublishedLeagueBySlug', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 503 when organization is paused', async () => {
    vi.mocked(db.seasonMobileConfig.findFirst).mockResolvedValue({
      seasonId: 'season-1',
      slug: 'demo-liga',
      displayName: 'Demo',
      shortName: null,
      description: null,
      logoStoragePath: '/logo.webp',
      primaryColor: null,
      secondaryColor: null,
      isPublished: true,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      season: {
        id: 'season-1',
        name: 'Demo',
        organizationId: 'org-1',
        startDate: new Date(),
        endDate: new Date(),
        footballFormat: 'FUTBOL_11',
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { status: OrganizationStatus.PAUSED },
        seasonTeams: [],
      },
    } as never)

    await expect(resolvePublishedLeagueBySlug('demo-liga')).rejects.toEqual(
      new MobileApiError(503, 'Organización no disponible'),
    )
  })
})
