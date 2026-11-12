import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/admin/seasons/[id]/sponsors/[sponsorId]/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  db: {
    season: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) },
    organization: { findUniqueOrThrow: vi.fn().mockResolvedValue({ plan: 'LEAGUE' }) },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/editorial/sponsors', () => ({
  updateSponsor: vi.fn(),
  setSponsorAssignment: vi.fn(),
}))

import { requireOrgRole } from '@/lib/auth'
import { setSponsorAssignment, updateSponsor } from '@/lib/editorial/sponsors'

describe('admin sponsors routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for cross-season sponsor updates', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(updateSponsor).mockResolvedValue(null)
    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Kelme' }),
      }),
      { params: Promise.resolve({ id: 'season-a', sponsorId: 'sponsor-b' }) },
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 for invalid date interval', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startsAt: '2026-08-20T00:00:00.000Z',
          endsAt: '2026-08-19T00:00:00.000Z',
        }),
      }),
      { params: Promise.resolve({ id: 'season-a', sponsorId: 'sponsor-b' }) },
    )
    expect(response.status).toBe(400)
  })

  it('accepts blank website as null', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(updateSponsor).mockResolvedValue({ id: 'sponsor-b', websiteUrl: null } as never)
    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: '' }),
      }),
      { params: Promise.resolve({ id: 'season-a', sponsorId: 'sponsor-b' }) },
    )
    expect(response.status).toBe(200)
    expect(updateSponsor).toHaveBeenCalledWith(
      'season-a',
      'sponsor-b',
      expect.objectContaining({ websiteUrl: null }),
    )
  })
})

describe('PUT /api/admin/seasons/[id]/sponsors/assignments', () => {
  beforeEach(() => vi.clearAllMocks())

  async function put(body: unknown) {
    const { PUT: putAssignment } = await import('@/app/api/admin/seasons/[id]/sponsors/assignments/route')
    return putAssignment(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: 'season-a' }) },
    )
  }

  const asAdmin = () =>
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)

  it('rechaza un target inválido con 400', async () => {
    asAdmin()
    expect((await put({ target: 'cancha:1', sponsorId: 'x' })).status).toBe(400)
  })

  it('responde 404 si el auspiciador no es de la temporada', async () => {
    asAdmin()
    vi.mocked(setSponsorAssignment).mockResolvedValue('not_found')
    expect((await put({ target: 'court:1', sponsorId: 'x' })).status).toBe(404)
  })

  it('guarda la asignación', async () => {
    asAdmin()
    vi.mocked(setSponsorAssignment).mockResolvedValue('ok')
    const res = await put({ target: 'court:1', sponsorId: 'x' })
    expect(res.status).toBe(200)
    expect(setSponsorAssignment).toHaveBeenCalledWith('season-a', { target: 'court:1', sponsorId: 'x' })
  })
})
