import { describe, expect, it } from 'vitest'
import {
  serializeMobileLeagueConfig,
  serializeMobileMatchSummary,
  serializeMobileTeamRef,
} from '@/lib/mobile/serializers'

const seasonTeam = {
  id: 'st-1',
  teamId: 't-1',
  displayName: 'Kelme Norte FC',
  color: '#CD212A',
  crestMimeType: 'image/png',
  crestData: new Uint8Array([1, 2, 3]),
}

describe('mobile serializers', () => {
  it('serializes ISO dates and absolute crest URLs without sensitive fields', () => {
    const ref = serializeMobileTeamRef('demo-liga', seasonTeam)
    expect(ref.crestUrl).toBe('/api/mobile/v1/leagues/demo-liga/teams/st-1/crest')
    expect(ref).not.toHaveProperty('crestData')
    expect(ref).not.toHaveProperty('passwordHash')

    const match = serializeMobileMatchSummary(
      'demo-liga',
      {
        id: 'm1',
        scheduledAt: new Date('2026-08-20T23:30:00.000Z'),
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0,
        venue: 'Cancha',
        regionName: 'Los Lagos',
        communeName: 'Puerto Varas',
        homeTeamId: 't-1',
        awayTeamId: 't-2',
      },
      seasonTeam,
      { ...seasonTeam, id: 'st-2', teamId: 't-2', displayName: 'Kelme Sur FC' },
    )

    expect(match.scheduledAt).toBe('2026-08-20T23:30:00.000Z')
    expect(JSON.stringify(match)).not.toContain('refereeId')
    expect(JSON.stringify(match)).not.toContain('crestData')
  })

  it('serializes league config with ISO season dates', () => {
    const config = serializeMobileLeagueConfig(
      {
        slug: 'demo-liga',
        displayName: 'Demo',
        shortName: null,
        description: null,
        logoStoragePath: null,
        primaryColor: '#CD212A',
        secondaryColor: '#FFFFFF',
        isPublished: true,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        seasonId: 's1',
      },
      {
        id: 's1',
        name: 'Demo',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: new Date('2026-11-30T00:00:00.000Z'),
        footballFormat: 'FUTBOL_11',
        isActive: true,
        createdAt: new Date(),
      },
    )
    expect(config.season.startDate).toBe('2026-03-01T00:00:00.000Z')
  })
})
