import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/organization/[organizationSlug]/hero-images/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/admin-org-route', () => ({
  requireOrgAdminForSlug: vi.fn(),
  mapAdminOrgRouteError: vi.fn(),
  mapHeroImageUploadError: vi.fn(),
}))

vi.mock('@/lib/billing/enforce', () => ({
  enforceCapability: vi.fn(),
}))

vi.mock('@/lib/org-hero-images', () => ({
  addOrgHeroImage: vi.fn(),
  listOrgHeroImages: vi.fn(),
  newOrgHeroImageId: vi.fn(() => 'hero-1'),
  orgHeroImageStoragePath: vi.fn(() => 'orgs/org-1/hero/hero-1.webp'),
}))

vi.mock('@/lib/editorial/storage', () => ({
  uploadEditorialObject: vi.fn(),
  editorialStoragePath: (segments: string[]) => segments.join('/'),
}))

vi.mock('@/lib/editorial/urls', () => ({
  editorialPublicUrl: (path: string) => `https://cdn.test/${path}`,
}))

import {
  mapAdminOrgRouteError,
  mapHeroImageUploadError,
  requireOrgAdminForSlug,
} from '@/lib/admin-org-route'
import { enforceCapability } from '@/lib/billing/enforce'
import { addOrgHeroImage } from '@/lib/org-hero-images'
import { uploadEditorialObject } from '@/lib/editorial/storage'

function imageRequest() {
  const file = new File([new Uint8Array([1, 2, 3])], 'hero.webp', { type: 'image/webp' })
  const form = new FormData()
  form.set('photo', file)
  return new Request('http://localhost', { method: 'POST', body: form })
}

describe('admin org hero images route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireOrgAdminForSlug).mockRejectedValue(new Error('Unauthorized'))
    vi.mocked(mapAdminOrgRouteError).mockReturnValue({ message: 'No autorizado.', status: 401 })
    const response = await POST(imageRequest(), {
      params: Promise.resolve({ organizationSlug: 'loslunes' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 403 when plan lacks capability', async () => {
    vi.mocked(requireOrgAdminForSlug).mockResolvedValue({
      organizationId: 'org-1',
    } as never)
    vi.mocked(enforceCapability).mockResolvedValue({
      ok: false,
      error: 'Tu plan no incluye esto.',
    })
    const response = await POST(imageRequest(), {
      params: Promise.resolve({ organizationSlug: 'loslunes' }),
    })
    expect(response.status).toBe(403)
  })

  it('uploads a valid hero image', async () => {
    vi.mocked(requireOrgAdminForSlug).mockResolvedValue({
      organizationId: 'org-1',
    } as never)
    vi.mocked(enforceCapability).mockResolvedValue({ ok: true })
    vi.mocked(uploadEditorialObject).mockResolvedValue(undefined)
    vi.mocked(addOrgHeroImage).mockResolvedValue({
      ok: true,
      image: {
        id: 'img-1',
        storagePath: 'orgs/org-1/hero/hero-1.webp',
        sortOrder: 0,
      },
    } as never)

    const response = await POST(imageRequest(), {
      params: Promise.resolve({ organizationSlug: 'loslunes' }),
    })
    expect(response.status).toBe(201)
    expect(requireOrgAdminForSlug).toHaveBeenCalledWith('loslunes')
    expect(uploadEditorialObject).toHaveBeenCalled()
    expect(addOrgHeroImage).toHaveBeenCalled()
  })

  it('accepts jpg files without mime type using the extension', async () => {
    vi.mocked(requireOrgAdminForSlug).mockResolvedValue({
      organizationId: 'org-1',
    } as never)
    vi.mocked(enforceCapability).mockResolvedValue({ ok: true })
    vi.mocked(uploadEditorialObject).mockResolvedValue(undefined)
    vi.mocked(addOrgHeroImage).mockResolvedValue({
      ok: true,
      image: {
        id: 'img-1',
        storagePath: 'orgs/org-1/hero/hero-1.jpg',
        sortOrder: 0,
      },
    } as never)

    const file = new File([new Uint8Array([1, 2, 3])], 'foto.jpg', { type: '' })
    const form = new FormData()
    form.set('photo', file)
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: form }),
      { params: Promise.resolve({ organizationSlug: 'loslunes' }) },
    )
    expect(response.status).toBe(201)
  })

  it('returns storage errors without masking them as unauthorized', async () => {
    vi.mocked(requireOrgAdminForSlug).mockResolvedValue({
      organizationId: 'org-1',
    } as never)
    vi.mocked(enforceCapability).mockResolvedValue({ ok: true })
    vi.mocked(uploadEditorialObject).mockRejectedValue(new Error('Bucket not found'))
    vi.mocked(mapAdminOrgRouteError).mockReturnValue(null)
    vi.mocked(mapHeroImageUploadError).mockReturnValue({
      message: 'Bucket not found',
      status: 500,
    })

    const response = await POST(imageRequest(), {
      params: Promise.resolve({ organizationSlug: 'loslunes' }),
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Bucket not found')
  })
})
