import { beforeAll, afterEach, afterAll, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomeScreen from '../../app/(tabs)/index'
import { server } from '../../src/test/mocks/handlers'
import { http, HttpResponse } from 'msw'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('home screen', () => {
  it('prioritizes live, upcoming, results, news and sponsors', async () => {
    server.use(
      http.get('https://example.test/api/mobile/v1/leagues/liga-invierno-kelme-puerto-varas-2026/home', () =>
        HttpResponse.json({
          league: {
            slug: 'liga-invierno-kelme-puerto-varas-2026',
            displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
            shortName: 'Kelme Invierno 2026',
            description: null,
            logoUrl: null,
            primaryColor: '#CD212A',
            secondaryColor: '#FFFFFF',
            footballFormat: 'FUTBOL_7',
            season: {
              startDate: '2026-06-01T04:00:00.000Z',
              endDate: '2026-09-01T04:00:00.000Z',
            },
          },
          featuredLiveMatch: {
            id: 'm-live',
            scheduledAt: '2026-08-21T23:30:00.000Z',
            status: 'LIVE',
            statusLabel: 'En juego',
            home: {
              seasonTeamId: 'st-1',
              teamId: 't-1',
              name: 'Rojo',
              color: '#CD212A',
              crestUrl: null,
              initials: 'RO',
            },
            away: {
              seasonTeamId: 'st-2',
              teamId: 't-2',
              name: 'Negro',
              color: '#111111',
              crestUrl: null,
              initials: 'NE',
            },
            homeScore: 1,
            awayScore: 0,
            venue: null,
            locationLabel: null,
          },
          upcomingMatches: [],
          recentResults: [],
          recentArticles: [
            {
              id: 'a-1',
              title: 'Fecha 1',
              summary: 'Resumen',
              coverUrl: null,
              publishedAt: '2026-08-20T15:00:00.000Z',
            },
          ],
          sponsors: [
            {
              id: 's-1',
              name: 'Kelme',
              logoUrl: null,
              bannerUrl: null,
              websiteUrl: null,
              placement: 'HOME',
            },
          ],
        }),
      ),
    )

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('En vivo')).toBeTruthy()
      expect(screen.getByText('EN VIVO')).toBeTruthy()
      expect(screen.getByText('Noticias')).toBeTruthy()
      expect(screen.getByText('Fecha 1')).toBeTruthy()
      expect(screen.getByText('Patrocinadores')).toBeTruthy()
    })
  })
})
