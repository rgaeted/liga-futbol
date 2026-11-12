import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const db = vi.hoisted(() => ({ team: { findUnique: vi.fn() } }))
vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth', () => ({ requireOrgRole: vi.fn(), assertSameOrganization: vi.fn() }))

import { GET } from '@/app/api/teams/[id]/crest/route'

const UPDATED = new Date('2026-11-12T10:00:00.000Z')
const ETAG = `"${UPDATED.getTime()}"`

const get = (headers: Record<string, string> = {}) =>
  GET(new Request('http://localhost/api/teams/t1/crest', { headers }), {
    params: Promise.resolve({ id: 't1' }),
  })

describe('GET /api/teams/[id]/crest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('revalida siempre para que un escudo cambiado se vea de inmediato', async () => {
    db.team.findUnique
      .mockResolvedValueOnce({ crestMimeType: 'image/png', updatedAt: UPDATED })
      .mockResolvedValueOnce({ crestData: Buffer.from([1, 2, 3]) })
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('must-revalidate')
    expect(res.headers.get('Cache-Control')).not.toContain('86400')
    expect(res.headers.get('ETag')).toBe(ETAG)
  })

  it('responde 304 sin leer la imagen si el ETag coincide', async () => {
    db.team.findUnique.mockResolvedValueOnce({ crestMimeType: 'image/png', updatedAt: UPDATED })
    const res = await get({ 'If-None-Match': ETAG })
    expect(res.status).toBe(304)
    expect(db.team.findUnique).toHaveBeenCalledTimes(1)
  })

  it('responde 404 si el equipo no tiene escudo', async () => {
    db.team.findUnique.mockResolvedValueOnce({ crestMimeType: null, updatedAt: UPDATED })
    expect((await get()).status).toBe(404)
  })
})
