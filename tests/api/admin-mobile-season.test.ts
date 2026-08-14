import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/admin/seasons/[id]/mobile/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/admin-season-route', () => ({
  requireAdminSeason: vi.fn().mockResolvedValue({ organizationId: 'org-1' }),
  mapAdminSeasonRouteError: (error: unknown) => {
    if (error instanceof Error && error.message === 'NotFound') {
      return { message: 'Temporada no encontrada', status: 404 }
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return { message: 'No autorizado.', status: 403 }
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { message: 'No autorizado.', status: 401 }
    }
    return null
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    seasonMobileConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    seasonTeam: {
      count: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

function requestWith(body: unknown) {
  return new Request('http://localhost', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const existingConfig = {
  seasonId: 'season-1',
  slug: 'slug-original',
  displayName: 'Demo',
  shortName: null,
  description: null,
  logoStoragePath: 'seasons/season-1/logo.webp',
  primaryColor: null,
  secondaryColor: null,
  isPublished: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('PUT /api/admin/seasons/[id]/mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue(null)
    vi.mocked(db.seasonMobileConfig.upsert).mockImplementation(async ({ create, update, where }) => {
      const data = create ?? update
      return {
        seasonId: where.seasonId,
        slug: data.slug,
        displayName: data.displayName,
        shortName: data.shortName ?? null,
        description: data.description ?? null,
        logoStoragePath: existingConfig.logoStoragePath,
        primaryColor: data.primaryColor ?? null,
        secondaryColor: data.secondaryColor ?? null,
        isPublished: data.isPublished ?? false,
        publishedAt: data.publishedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
  })

  it('rejects slug changes after first save', async () => {
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue(existingConfig)

    const response = await PUT(
      requestWith({
        slug: 'slug-nuevo',
        displayName: 'Demo',
        isPublished: false,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'El slug no se puede cambiar después',
    })
  })

  it('does not publish a season without registered teams', async () => {
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue(existingConfig)
    vi.mocked(db.seasonTeam.count).mockResolvedValue(0)

    const response = await PUT(
      requestWith({
        slug: 'slug-original',
        displayName: 'Demo',
        isPublished: true,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Debes inscribir al menos un equipo antes de publicar',
    })
  })

  it('publishes with one registered team and logo', async () => {
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue(existingConfig)
    vi.mocked(db.seasonTeam.count).mockResolvedValue(1)

    const response = await PUT(
      requestWith({
        slug: 'slug-original',
        displayName: 'Demo',
        isPublished: true,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      config: { isPublished: true, slug: 'slug-original' },
    })
  })

  it('rejects reserved slug admin', async () => {
    const response = await PUT(
      requestWith({
        slug: 'admin',
        displayName: 'Demo',
        isPublished: false,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'El slug está reservado' })
  })
})
