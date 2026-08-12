import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/admin/seasons/[id]/mobile/route'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
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

describe('PUT /api/admin/seasons/[id]/mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue(null)
  })

  it('does not publish a season without two registered teams', async () => {
    vi.mocked(db.seasonTeam.count).mockResolvedValue(1)

    const response = await PUT(
      requestWith({
        slug: 'demo-liga',
        displayName: 'Demo',
        isPublished: true,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Debes inscribir al menos dos equipos antes de publicar',
    })
  })

  it('rejects slug changes after publication', async () => {
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue({
      seasonId: 'season-1',
      slug: 'slug-original',
      displayName: 'Demo',
      shortName: null,
      description: null,
      logoStoragePath: null,
      primaryColor: null,
      secondaryColor: null,
      isPublished: true,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(db.seasonTeam.count).mockResolvedValue(2)

    const response = await PUT(
      requestWith({
        slug: 'slug-nuevo',
        displayName: 'Demo',
        isPublished: true,
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'El slug no se puede cambiar después de publicar',
    })
  })
})
