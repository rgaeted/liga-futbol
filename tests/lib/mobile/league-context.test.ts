import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchType } from '@prisma/client'
import { MobileApiError } from '@/lib/mobile/errors'
import { assertLeagueMatch } from '@/lib/mobile/league-context'

const league = {
  config: { slug: 'demo', isPublished: true } as never,
  season: { id: 'season-1' } as never,
  seasonTeamByTeamId: new Map(),
}

describe('assertLeagueMatch', () => {
  it('allows a league match in the resolved season', () => {
    expect(() =>
      assertLeagueMatch({ seasonId: 'season-1', matchType: MatchType.LEAGUE }, league),
    ).not.toThrow()
  })

  it('rejects cross-season matches', () => {
    expect(() =>
      assertLeagueMatch({ seasonId: 'season-2', matchType: MatchType.LEAGUE }, league),
    ).toThrow(new MobileApiError(404, 'Partido no encontrado'))
  })

  it('rejects friendly matches', () => {
    expect(() =>
      assertLeagueMatch({ seasonId: 'season-1', matchType: MatchType.FRIENDLY }, league),
    ).toThrow(new MobileApiError(404, 'Partido no encontrado'))
  })
})

describe('resolvePublishedLeagueBySlug', () => {
  beforeEach(() => vi.resetModules())

  it('returns null for unpublished slugs', async () => {
    vi.doMock('@/lib/db', () => ({
      db: {
        seasonMobileConfig: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    }))
    const { resolvePublishedLeagueBySlug } = await import('@/lib/mobile/league-context')
    await expect(resolvePublishedLeagueBySlug('draft-slug')).resolves.toBeNull()
  })
})
