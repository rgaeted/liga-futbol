import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listMobileMatches } from '@/lib/mobile/matches'

vi.mock('@/lib/db', () => ({
  db: {
    match: { findMany: vi.fn() },
    seasonTeam: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'

const league = {
  config: { slug: 'demo' } as never,
  season: { id: 'season-1' } as never,
  seasonTeamByTeamId: new Map(),
}

describe('listMobileMatches', () => {
  beforeEach(() => vi.clearAllMocks())

  it('scopes queries to the resolved season and paginates with cursor', async () => {
    vi.mocked(db.seasonTeam.findMany).mockResolvedValue([
      {
        id: 'st1',
        teamId: 't1',
        displayName: 'Rojo',
        color: '#f00',
        crestMimeType: null,
        crestData: null,
        seasonId: 'season-1',
        status: 'REGISTERED',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'st2',
        teamId: 't2',
        displayName: 'Azul',
        color: '#00f',
        crestMimeType: null,
        crestData: null,
        seasonId: 'season-1',
        status: 'REGISTERED',
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never)

    vi.mocked(db.match.findMany).mockResolvedValue([
      {
        id: 'm1',
        scheduledAt: new Date('2026-08-20T23:30:00.000Z'),
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0,
        venue: null,
        regionName: null,
        communeName: null,
        homeTeamId: 't1',
        awayTeamId: 't2',
      },
    ] as never)

    const page = await listMobileMatches(league, { limit: 20, status: 'all' })
    expect(page.items).toHaveLength(1)
    expect(db.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ seasonId: 'season-1', matchType: 'LEAGUE' }),
        take: 21,
      }),
    )
  })
})
