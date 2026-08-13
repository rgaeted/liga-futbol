import { beforeAll, afterEach, afterAll, describe, expect, it } from 'vitest'
import { MobileApiClient } from '../../src/api/client'
import { mobileLeagueConfigSchema } from '@liga/mobile-contracts/schemas'
import { EDITION_SLUG, server } from '../../src/test/mocks/handlers'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MobileApiClient', () => {
  const client = new MobileApiClient('https://example.test')

  it('parses successful responses with the supplied schema', async () => {
    const result = await client.get(
      `/api/mobile/v1/leagues/${EDITION_SLUG}`,
      mobileLeagueConfigSchema,
    )
    expect(result.slug).toBe(EDITION_SLUG)
  })

  it('maps malformed JSON to a user-safe error', async () => {
    await expect(client.get('/broken', mobileLeagueConfigSchema)).rejects.toMatchObject({
      userMessage: 'No pudimos cargar la información',
    })
  })
})
