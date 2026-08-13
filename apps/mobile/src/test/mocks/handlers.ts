import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { mobileLeagueConfigSchema } from '@liga/mobile-contracts/schemas'

export const EDITION_SLUG = 'liga-invierno-kelme-puerto-varas-2026'
const API_BASE = 'https://example.test'

const leagueFixture = mobileLeagueConfigSchema.parse({
  slug: EDITION_SLUG,
  displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
  shortName: 'Kelme Invierno 2026',
  description: 'Temporada invierno',
  logoUrl: null,
  primaryColor: '#CD212A',
  secondaryColor: '#FFFFFF',
  footballFormat: 'FUTBOL_7',
  season: {
    startDate: '2026-06-01T04:00:00.000Z',
    endDate: '2026-09-01T04:00:00.000Z',
  },
})

export const handlers = [
  http.get(`${API_BASE}/api/mobile/v1/leagues/${EDITION_SLUG}`, () =>
    HttpResponse.json(leagueFixture),
  ),
  http.get(`${API_BASE}/api/mobile/v1/leagues/${EDITION_SLUG}/home`, () =>
    HttpResponse.json({
      league: leagueFixture,
      featuredLiveMatch: null,
      upcomingMatches: [],
      recentResults: [],
      recentArticles: [],
      sponsors: [],
    }),
  ),
  http.get(`${API_BASE}/broken`, () => HttpResponse.text('{', { status: 200 })),
]

export const server = setupServer(...handlers)
