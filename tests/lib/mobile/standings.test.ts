import { describe, expect, it } from 'vitest'
import { buildMobileStandings } from '@/lib/mobile/standings'

const finishedMatchesFixture = [
  {
    homeTeamId: 't1',
    awayTeamId: 't2',
    homeScore: 2,
    awayScore: 1,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't2', name: 'Negro', color: '#111111' },
  },
  {
    homeTeamId: 't1',
    awayTeamId: 't3',
    homeScore: 1,
    awayScore: 1,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
  {
    homeTeamId: 't2',
    awayTeamId: 't3',
    homeScore: 0,
    awayScore: 2,
    homeTeam: { id: 't2', name: 'Negro', color: '#111111' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
  {
    homeTeamId: 't1',
    awayTeamId: 't3',
    homeScore: 2,
    awayScore: 0,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
]

const seasonTeamByTeamId = new Map([
  ['t1', { seasonTeamId: 'st1', teamId: 't1', displayName: 'Rojo', color: '#CD212A', crestMimeType: null }],
  ['t2', { seasonTeamId: 'st2', teamId: 't2', displayName: 'Negro', color: '#111111', crestMimeType: null }],
  ['t3', { seasonTeamId: 'st3', teamId: 't3', displayName: 'Azul', color: '#0055ff', crestMimeType: null }],
])

describe('buildMobileStandings', () => {
  it('orders equal points by goal difference, goals for, then es-CL name', () => {
    const rows = buildMobileStandings(finishedMatchesFixture, seasonTeamByTeamId)
    expect(rows.map((row) => row.name)).toEqual(['Rojo', 'Azul', 'Negro'])
    expect(rows[0]).toMatchObject({ pg: 2, pe: 1, pp: 0, pts: 7 })
  })
})
