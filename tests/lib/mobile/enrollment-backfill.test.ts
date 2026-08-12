import { describe, expect, it, vi } from 'vitest'
import { buildSeasonEnrollmentSeed, backfillSeasonEnrollment } from '@/lib/mobile/enrollment-backfill'

describe('buildSeasonEnrollmentSeed', () => {
  it('merges current team players with historical callups without duplicates', () => {
    const seed = buildSeasonEnrollmentSeed({
      seasonId: 's1',
      seasonName: 'Temporada Demo',
      teamsFromMatches: [{ id: 't1', name: 'Rojo', color: null, crestMimeType: null, crestData: null, players: [{ id: 'p1' }] }],
      callups: [{ teamId: 't1', playerId: 'p2' }, { teamId: 't1', playerId: 'p1' }],
    })
    expect(seed.teams[0].playerIds).toEqual(['p1', 'p2'])
  })
})

describe('backfillSeasonEnrollment', () => {
  it('is idempotent on repeated runs', async () => {
    const upsertCalls: string[] = []
    const db = {
      season: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'season-1',
            name: 'Demo',
            mobileConfig: null,
            matches: [
              {
                homeTeamId: 't1',
                awayTeamId: 't2',
                callUps: [{ playerId: 'p1', player: { teamId: 't1' } }],
              },
            ],
          },
        ]),
      },
      team: {
        findMany: vi.fn().mockResolvedValue([
          { id: 't1', name: 'Rojo', color: '#f00', crestMimeType: null, crestData: null, players: [{ id: 'p1' }] },
          { id: 't2', name: 'Azul', color: '#00f', crestMimeType: null, crestData: null, players: [] },
        ]),
      },
      seasonMobileConfig: {
        create: vi.fn().mockResolvedValue({}),
      },
      seasonTeam: {
        upsert: vi.fn().mockImplementation(({ where }) => {
          upsertCalls.push(`team:${where.seasonId_teamId.seasonId}:${where.seasonId_teamId.teamId}`)
          return Promise.resolve({ id: `st-${where.seasonId_teamId.teamId}` })
        }),
      },
      player: {
        findUnique: vi.fn().mockResolvedValue({ jerseyNumber: 10, position: 'Delantero' }),
      },
      seasonRosterEntry: {
        upsert: vi.fn().mockImplementation(({ where }) => {
          upsertCalls.push(`roster:${where.seasonTeamId_playerId.seasonTeamId}:${where.seasonTeamId_playerId.playerId}`)
          return Promise.resolve({})
        }),
      },
    }

    await backfillSeasonEnrollment(db as never)
    const first = [...upsertCalls]
    upsertCalls.length = 0
    await backfillSeasonEnrollment(db as never)

    expect(first).toEqual(upsertCalls)
    expect(db.seasonTeam.upsert).toHaveBeenCalledTimes(4)
    expect(db.seasonRosterEntry.upsert).toHaveBeenCalledTimes(2)
  })
})
