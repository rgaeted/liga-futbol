import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as getArticles } from '@/app/api/mobile/v1/leagues/[slug]/articles/route'
import { GET as getArticleDetail } from '@/app/api/mobile/v1/leagues/[slug]/articles/[articleId]/route'
import { GET as getSponsors } from '@/app/api/mobile/v1/leagues/[slug]/sponsors/route'

vi.mock('@/lib/mobile/league-context', () => ({
  resolvePublishedLeagueBySlug: vi.fn(),
}))

vi.mock('@/lib/editorial/public-queries', () => ({
  listPublishedArticles: vi.fn(),
  getPublishedArticle: vi.fn(),
  listPublishedSponsors: vi.fn(),
}))

import {
  getPublishedArticle,
  listPublishedArticles,
  listPublishedSponsors,
} from '@/lib/editorial/public-queries'
import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'

const league = {
  config: { slug: 'demo' },
  season: { id: 'season-1' },
  seasonTeamByTeamId: new Map(),
}

describe('mobile editorial routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unpublished slugs', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(null)
    const response = await getArticles(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'borrador' }),
    })
    expect(response.status).toBe(404)
  })

  it('returns paginated published articles', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(listPublishedArticles).mockResolvedValue({ items: [], nextCursor: null })
    const response = await getArticles(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [], nextCursor: null })
  })

  it('returns 404 for draft articles', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(getPublishedArticle).mockResolvedValue(null)
    const response = await getArticleDetail(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo', articleId: 'draft-1' }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 400 for invalid query params', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    const response = await getArticles(
      new Request('http://localhost/api/mobile/v1/leagues/demo/articles?limit=abc'),
      { params: Promise.resolve({ slug: 'demo' }) },
    )
    expect(response.status).toBe(400)
  })

  it('lists active sponsors for a published league', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(listPublishedSponsors).mockResolvedValue([])
    const response = await getSponsors(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo' }),
    })
    expect(response.status).toBe(200)
    expect(listPublishedSponsors).toHaveBeenCalled()
  })
})
