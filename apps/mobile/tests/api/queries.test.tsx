import { beforeAll, afterEach, afterAll, describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { Text } from 'react-native'
import { http, HttpResponse } from 'msw'
import { useLeagueQuery } from '../../src/api/queries'
import { EDITION_SLUG, server } from '../../src/test/mocks/handlers'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function Probe() {
  const query = useLeagueQuery()
  if (query.isLoading) return <Text>Cargando</Text>
  if (query.isError && !query.data) return <Text>Error</Text>
  return (
    <>
      <Text>{query.data?.displayName}</Text>
      {query.isError ? <Text>stale-error</Text> : null}
    </>
  )
}

describe('query cache', () => {
  it('preserves cached data when a later request fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Liga de Invierno Kelme Puerto Varas 2026')).toBeTruthy()
    })

    server.use(
      http.get(`https://example.test/api/mobile/v1/leagues/${EDITION_SLUG}`, () =>
        HttpResponse.error(),
      ),
    )

    await client.invalidateQueries()
    await waitFor(() => {
      expect(screen.getByText('stale-error')).toBeTruthy()
      expect(screen.getByText('Liga de Invierno Kelme Puerto Varas 2026')).toBeTruthy()
    })
  })
})
