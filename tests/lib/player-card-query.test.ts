import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationStatus } from '@prisma/client'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: vi.fn() },
    match: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/badges/query', () => ({
  getPlayerEarnedBadgesForCard: vi.fn(),
}))

import { db } from '@/lib/db'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'

const cardPhotoUpdatedAt = new Date('2026-09-13T05:06:07.000Z')
const personUpdatedAt = new Date('2026-09-13T06:07:08.000Z')

function playerRow({
  cardPhotoMimeType = 'image/png',
  cardUpdatedAt = cardPhotoUpdatedAt,
}: {
  cardPhotoMimeType?: string | null
  cardUpdatedAt?: Date | null
} = {}) {
  return {
    id: 'p1',
    organizationId: 'org-1',
    primaryPosition: 'Delantero',
    position: null,
    organization: {
      slug: 'loslunes',
      status: OrganizationStatus.ACTIVE,
      badgesEnabled: false,
    },
    person: {
      firstName: 'Fernando',
      lastName: 'Opitz',
      user: null,
      cardPhotoMimeType,
      cardPhotoUpdatedAt: cardUpdatedAt,
      updatedAt: personUpdatedAt,
    },
    playerAwards: [],
  }
}

async function loadCard() {
  vi.mocked(db.match.findMany).mockResolvedValue([])
  return getLosLunesPlayerCard('p1')
}

describe('getLosLunesPlayerCard photo contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the versioned persisted card-photo URL and derivative flag', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue(playerRow() as never)

    const result = await loadCard()

    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.card.player).toMatchObject({
      fotoUrl: `/api/players/p1/card-photo?v=${cardPhotoUpdatedAt.getTime()}`,
      fotoEsRecorte: true,
    })
  })

  it('versions the original fallback with the Person update timestamp', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue(
      playerRow({ cardPhotoMimeType: null, cardUpdatedAt: null }) as never,
    )

    const result = await loadCard()

    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.card.player).toMatchObject({
      fotoUrl: `/api/players/p1/card-photo?v=${personUpdatedAt.getTime()}`,
      fotoEsRecorte: false,
    })
  })

  it('selects card photo metadata without loading derivative bytes', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue(playerRow() as never)

    await loadCard()

    const query = vi.mocked(db.player.findUnique).mock.calls[0]?.[0]
    expect(query).toMatchObject({
      select: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            cardPhotoMimeType: true,
            cardPhotoUpdatedAt: true,
            updatedAt: true,
          },
        },
      },
    })
    expect(JSON.stringify(query)).not.toContain('cardPhotoData')
  })
})
