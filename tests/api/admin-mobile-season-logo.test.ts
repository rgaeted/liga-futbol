import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/seasons/[id]/mobile/logo/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    season: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) },
    organization: { findUniqueOrThrow: vi.fn().mockResolvedValue({ plan: 'LEAGUE' }) },
    seasonMobileConfig: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/editorial/storage', () => ({
  uploadEditorialObject: vi.fn(),
  bestEffortDeleteEditorialObjects: vi.fn(),
  editorialStoragePath: (segments: string[]) => segments.join('/'),
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadEditorialObject } from '@/lib/editorial/storage'

describe('admin mobile season logo route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('Unauthorized'))
    const file = new File([new Uint8Array([1])], 'logo.webp', { type: 'image/webp' })
    const form = new FormData()
    form.set('logo', file)
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: form }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(401)
  })

  it('uploads logo after config exists', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(db.seasonMobileConfig.findUnique).mockResolvedValue({
      seasonId: 'season-1',
      logoStoragePath: null,
    } as never)
    vi.mocked(uploadEditorialObject).mockResolvedValue(undefined)
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.webp', { type: 'image/webp' })
    const form = new FormData()
    form.set('logo', file)
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: form }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(200)
    expect(uploadEditorialObject).toHaveBeenCalled()
    expect(db.seasonMobileConfig.update).toHaveBeenCalled()
  })
})
