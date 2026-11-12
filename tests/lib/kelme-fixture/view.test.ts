import { describe, expect, it } from 'vitest'
import { DEFAULT_FIXTURE_CONFIG } from '@/lib/kelme-fixture/types'
import { buildFixtureView, type FixtureSnapshot } from '@/lib/kelme-fixture/view'

const startAt = new Date('2026-11-15T12:00:00Z')

function snapshot(crestUrl: string | null): FixtureSnapshot {
  return {
    seasonId: 's1',
    seasonName: 'Kelme',
    config: DEFAULT_FIXTURE_CONFIG,
    teams: [
      { id: 'a', name: 'Amiguitos', category: '2019-2018', group: null, sortOrder: 0, color: '#112233', crestUrl },
      { id: 'b', name: 'Sin Escudo', category: '2019-2018', group: null, sortOrder: 1, color: null, crestUrl: null },
    ],
    matches: [
      {
        id: 'm1',
        code: 'M03',
        category: '2019-2018',
        phase: 'LEAGUE',
        group: null,
        court: 3,
        startAt,
        endAt: new Date(startAt.getTime() + 35 * 60_000),
        homeTeamId: 'a',
        awayTeamId: 'b',
        homeSlot: null,
        awaySlot: null,
        homeGoals: 0,
        awayGoals: 0,
        status: 'SCHEDULED',
        decidedBy: null,
        penaltyHome: null,
        penaltyAway: null,
        updatedAt: startAt,
      },
    ],
  }
}

describe('buildFixtureView con escudos', () => {
  it('entrega el escudo de cada equipo en partidos y tablas, y null cuando no tiene', () => {
    const view = buildFixtureView(snapshot('/api/teams/a/crest?v=1'))
    expect(view.matches[0].home.crestUrl).toBe('/api/teams/a/crest?v=1')
    expect(view.matches[0].away.crestUrl).toBeNull()
    const row = view.tables.find((t) => t.key === 'LEAGUE')!.rows.find((r) => r.teamId === 'a')!
    expect(row.crestUrl).toBe('/api/teams/a/crest?v=1')
  })
})
