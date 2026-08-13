import { MobilePlatform } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as registerInstallationRoute } from '@/app/api/mobile/v1/leagues/[slug]/installations/route'
import { DELETE as deleteInstallationRoute } from '@/app/api/mobile/v1/leagues/[slug]/installations/[installationId]/route'
import { PUT as replaceSubscriptionsRoute } from '@/app/api/mobile/v1/leagues/[slug]/installations/[installationId]/subscriptions/route'
import { MobileApiError } from '@/lib/mobile/errors'

vi.mock('@/lib/mobile/league-context', () => ({
  resolvePublishedLeagueBySlug: vi.fn(),
}))

vi.mock('@/lib/mobile/installations/register', () => ({
  registerInstallation: vi.fn(),
}))

vi.mock('@/lib/mobile/installations/subscriptions', () => ({
  replaceTeamSubscriptions: vi.fn(),
}))

vi.mock('@/lib/mobile/installations/deactivate', () => ({
  deactivateInstallation: vi.fn(),
}))

vi.mock('@/lib/mobile/installations/rate-limit', () => ({
  checkInstallationRateLimit: vi.fn(),
}))

import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'
import { deactivateInstallation } from '@/lib/mobile/installations/deactivate'
import { checkInstallationRateLimit } from '@/lib/mobile/installations/rate-limit'
import { registerInstallation } from '@/lib/mobile/installations/register'
import { replaceTeamSubscriptions } from '@/lib/mobile/installations/subscriptions'

const installationId = '11111111-1111-4111-8111-111111111111'

const league = {
  config: { slug: 'demo-liga' },
  season: { id: 'season-1' },
  seasonTeamByTeamId: new Map(),
}

describe('mobile installation routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unpublished slugs', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(null)
    const response = await registerInstallationRoute(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId,
          expoPushToken: 'ExpoPushToken[abc]',
          platform: MobilePlatform.IOS,
        }),
      }),
      { params: Promise.resolve({ slug: 'borrador' }) },
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 for malformed push tokens', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    const response = await registerInstallationRoute(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId,
          expoPushToken: 'invalid-token',
          platform: MobilePlatform.IOS,
        }),
      }),
      { params: Promise.resolve({ slug: 'demo-liga' }) },
    )
    expect(response.status).toBe(400)
  })

  it('registers an installation with 201', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(registerInstallation).mockResolvedValue({
      installationId,
      status: 'ACTIVE',
    })

    const response = await registerInstallationRoute(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId,
          expoPushToken: 'ExpoPushToken[abc]',
          platform: MobilePlatform.IOS,
        }),
      }),
      { params: Promise.resolve({ slug: 'demo-liga' }) },
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ installationId, status: 'ACTIVE' })
    expect(registerInstallation).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: 'season-1', installationId }),
    )
  })

  it('returns 400 for cross-season team subscriptions', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(replaceTeamSubscriptions).mockRejectedValue(
      new MobileApiError(400, 'Uno o más equipos no pertenecen a esta edición'),
    )

    const response = await replaceSubscriptionsRoute(
      new Request('http://localhost', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${installationId}`,
        },
        body: JSON.stringify({ teams: [{ seasonTeamId: 'st-other' }] }),
      }),
      { params: Promise.resolve({ slug: 'demo-liga', installationId }) },
    )

    expect(response.status).toBe(400)
  })

  it('returns 401 when bearer does not match installation id', async () => {
    const response = await replaceSubscriptionsRoute(
      new Request('http://localhost', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer other-id',
        },
        body: JSON.stringify({ teams: [] }),
      }),
      { params: Promise.resolve({ slug: 'demo-liga', installationId }) },
    )

    expect(response.status).toBe(401)
  })

  it('deactivates an installation with 204', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    const response = await deleteInstallationRoute(
      new Request('http://localhost', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${installationId}` },
      }),
      { params: Promise.resolve({ slug: 'demo-liga', installationId }) },
    )
    expect(response.status).toBe(204)
    expect(deactivateInstallation).toHaveBeenCalledWith('season-1', installationId)
  })

  it('returns 429 with Retry-After when rate limited', async () => {
    vi.mocked(checkInstallationRateLimit).mockImplementation(() => {
      throw new MobileApiError(429, 'Demasiadas solicitudes. Intenta más tarde.')
    })

    const response = await registerInstallationRoute(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId,
          expoPushToken: 'ExpoPushToken[abc]',
          platform: MobilePlatform.IOS,
        }),
      }),
      { params: Promise.resolve({ slug: 'demo-liga' }) },
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
  })
})
