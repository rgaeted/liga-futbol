import { describe, expect, it } from 'vitest'
import { buildMobileStandings, buildMobileStandingsResponse } from '@/lib/mobile/standings'

const finishedMatchesFixture = [
  {
    seasonCategoryId: 'sc-all',
    homeTeamId: 't1',
    awayTeamId: 't2',
    homeScore: 2,
    awayScore: 1,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't2', name: 'Negro', color: '#111111' },
  },
  {
    seasonCategoryId: 'sc-all',
    homeTeamId: 't1',
    awayTeamId: 't3',
    homeScore: 1,
    awayScore: 1,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
  {
    seasonCategoryId: 'sc-all',
    homeTeamId: 't2',
    awayTeamId: 't3',
    homeScore: 0,
    awayScore: 2,
    homeTeam: { id: 't2', name: 'Negro', color: '#111111' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
  {
    seasonCategoryId: 'sc-all',
    homeTeamId: 't1',
    awayTeamId: 't3',
    homeScore: 2,
    awayScore: 0,
    homeTeam: { id: 't1', name: 'Rojo', color: '#CD212A' },
    awayTeam: { id: 't3', name: 'Azul', color: '#0055ff' },
  },
]

const seasonTeamByTeamId = new Map([
  ['t1', { seasonTeamId: 'st1', teamId: 't1', seasonCategoryId: 'sc-all', displayName: 'Rojo', color: '#CD212A', crestMimeType: null }],
  ['t2', { seasonTeamId: 'st2', teamId: 't2', seasonCategoryId: 'sc-all', displayName: 'Negro', color: '#111111', crestMimeType: null }],
  ['t3', { seasonTeamId: 'st3', teamId: 't3', seasonCategoryId: 'sc-all', displayName: 'Azul', color: '#0055ff', crestMimeType: null }],
])

describe('buildMobileStandings', () => {
  it('orders equal points by goal difference, goals for, then es-CL name', () => {
    const rows = buildMobileStandings(finishedMatchesFixture, seasonTeamByTeamId)
    expect(rows.map((row) => row.name)).toEqual(['Rojo', 'Azul', 'Negro'])
    expect(rows[0]).toMatchObject({ pg: 2, pe: 1, pp: 0, pts: 7 })
  })
})

describe('buildMobileStandingsResponse', () => {
  it('does not add a +35 win to the +40 table and leaves rows empty with two categories', () => {
    const response = buildMobileStandingsResponse({
      categories: [
        { categoryId: 'c35', name: '+35', seasonCategoryId: 'sc-35' },
        { categoryId: 'c40', name: '+40', seasonCategoryId: 'sc-40' },
      ],
      matches: [
        {
          seasonCategoryId: 'sc-35',
          homeTeamId: 't1',
          awayTeamId: 't2',
          homeScore: 2,
          awayScore: 0,
          homeTeam: { id: 't1', name: 'Búfalos', color: null },
          awayTeam: { id: 't2', name: 'Cobre', color: null },
        },
      ],
      seasonTeams: [
        {
          seasonTeamId: 'st1',
          teamId: 't1',
          seasonCategoryId: 'sc-35',
          displayName: 'Búfalos',
          color: null,
          crestMimeType: null,
        },
        {
          seasonTeamId: 'st2',
          teamId: 't2',
          seasonCategoryId: 'sc-35',
          displayName: 'Cobre',
          color: null,
          crestMimeType: null,
        },
      ],
    })
    expect(response.categories[0]!.rows[0]!.name).toBe('Búfalos')
    expect(response.categories[0]!.rows[0]!.pts).toBe(3)
    expect(response.categories[1]!.rows).toEqual([])
    expect(response.rows).toEqual([])
  })

  it('mirrors single-category rows in the top-level rows field', () => {
    const response = buildMobileStandingsResponse({
      categories: [{ categoryId: 'c35', name: '+35', seasonCategoryId: 'sc-35' }],
      matches: [
        {
          seasonCategoryId: 'sc-35',
          homeTeamId: 't1',
          awayTeamId: 't2',
          homeScore: 1,
          awayScore: 0,
          homeTeam: { id: 't1', name: 'Búfalos', color: null },
          awayTeam: { id: 't2', name: 'Cobre', color: null },
        },
      ],
      seasonTeams: [
        {
          seasonTeamId: 'st1',
          teamId: 't1',
          seasonCategoryId: 'sc-35',
          displayName: 'Búfalos',
          color: null,
          crestMimeType: null,
        },
        {
          seasonTeamId: 'st2',
          teamId: 't2',
          seasonCategoryId: 'sc-35',
          displayName: 'Cobre',
          color: null,
          crestMimeType: null,
        },
      ],
    })
    expect(response.rows).toEqual(response.categories[0]!.rows)
  })
})
