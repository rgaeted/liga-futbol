import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getPublicFixtureView = vi.hoisted(() => vi.fn())
vi.mock('@/lib/kelme-fixture/service', () => ({ getPublicFixtureView }))

import { GET } from '@/app/api/public/fixture/[organizationSlug]/export/route'

const get = (slug: string) =>
  GET(new Request(`http://localhost/api/public/fixture/${slug}/export`), {
    params: Promise.resolve({ organizationSlug: slug }),
  })

describe('GET /api/public/fixture/[organizationSlug]/export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 404 si la liga no tiene fixture', async () => {
    getPublicFixtureView.mockResolvedValue(null)
    expect((await get('otra')).status).toBe(404)
  })

  it('entrega un archivo de Excel descargable', async () => {
    getPublicFixtureView.mockResolvedValue({
      seasonName: 'Kelme',
      matches: [],
      tables: [],
      positions: [],
    })
    const res = await get('kelme')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="fixture-kelme.xlsx"')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
  })
})
