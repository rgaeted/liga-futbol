import { describe, expect, it } from 'vitest'
import { createSeasonSchema } from '@/lib/validations/season'
import { createLeagueMatchSchema } from '@/lib/validations/match'

describe('createSeasonSchema', () => {
  it('requires at least one categoryId', () => {
    const parsed = createSeasonSchema.safeParse({
      name: 'Apertura 2026',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
      footballFormat: 'FUTBOL_11',
      categoryIds: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts categoryIds', () => {
    const parsed = createSeasonSchema.safeParse({
      name: 'Apertura 2026',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
      footballFormat: 'FUTBOL_11',
      categoryIds: ['cat-35', 'cat-40'],
    })
    expect(parsed.success).toBe(true)
  })
})

describe('createLeagueMatchSchema', () => {
  it('requires seasonCategoryId', () => {
    const parsed = createLeagueMatchSchema.safeParse({
      matchType: 'LEAGUE',
      seasonId: 's1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-04-01T20:00:00.000Z',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts seasonCategoryId', () => {
    const parsed = createLeagueMatchSchema.safeParse({
      matchType: 'LEAGUE',
      seasonId: 's1',
      seasonCategoryId: 'sc-35',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-04-01T20:00:00.000Z',
    })
    expect(parsed.success).toBe(true)
  })
})
