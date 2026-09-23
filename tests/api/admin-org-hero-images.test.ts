import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/organization/hero-images/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
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

import { requireOrgRole } from '@/lib/auth'
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
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(imageRequest())
    expect(response.status).toBe(401)
  })

  it('returns 403 when plan lacks capability', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
    } as never)
    vi.mocked(enforceCapability).mockResolvedValue({
      ok: false,
      error: 'Tu plan no incluye esto.',
    })
    const response = await POST(imageRequest())
    expect(response.status).toBe(403)
  })

  it('uploads a valid hero image', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
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

    const response = await POST(imageRequest())
    expect(response.status).toBe(201)
    expect(uploadEditorialObject).toHaveBeenCalled()
    expect(addOrgHeroImage).toHaveBeenCalled()
  })
})
