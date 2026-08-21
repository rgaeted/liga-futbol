import { describe, expect, it } from 'vitest'
import { buildStandingsByCategory } from '@/lib/admin-dashboard-standings'

describe('buildStandingsByCategory', () => {
  it('does not add a +35 win to the +40 table', () => {
    const blocks = buildStandingsByCategory(
      [
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
      [
        { id: 'sc-35', categoryId: 'c35', name: '+35' },
        { id: 'sc-40', categoryId: 'c40', name: '+40' },
      ],
    )
    expect(blocks[0]!.rows[0]!.team).toBe('Búfalos')
    expect(blocks[0]!.rows[0]!.pts).toBe(3)
    expect(blocks[1]!.rows).toEqual([])
  })
})
