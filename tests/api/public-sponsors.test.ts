import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const db = vi.hoisted(() => ({
  sponsor: { findUnique: vi.fn(), findMany: vi.fn() },
  sponsorMonthlyStat: { upsert: vi.fn().mockResolvedValue({}) },
}))
vi.mock('@/lib/db', () => ({ db }))

import { GET } from '@/app/api/public/sponsors/[sponsorId]/click/route'
import { POST } from '@/app/api/public/sponsors/views/route'

const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'

function sponsor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp1',
    isActive: true,
    startsAt: null,
    endsAt: null,
    ctaUrl: 'https://wa.me/56911112222',
    websiteUrl: 'https://x.cl',
    season: { organization: { slug: 'kelme' } },
    ...overrides,
  }
}

const click = (to: string, ua = CHROME) =>
  GET(new Request(`http://localhost/api/public/sponsors/sp1/click?to=${to}`, { headers: { 'user-agent': ua } }), {
    params: Promise.resolve({ sponsorId: 'sp1' }),
  })

const views = (body: unknown, ua = CHROME) =>
  POST(
    new Request('http://localhost/api/public/sponsors/views', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': ua },
      body: JSON.stringify(body),
    }),
  )

describe('clic en auspiciador', () => {
  beforeEach(() => vi.clearAllMocks())

  it('suma un clic y redirige al botón del auspiciador', async () => {
    db.sponsor.findUnique.mockResolvedValue(sponsor())
    const res = await click('cta')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wa.me/56911112222')
    expect(db.sponsorMonthlyStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { clicks: { increment: 1 } } }),
    )
  })

  it('redirige pero no cuenta cuando el agente es un bot', async () => {
    db.sponsor.findUnique.mockResolvedValue(sponsor())
    const res = await click('cta', 'Googlebot/2.1')
    expect(res.status).toBe(302)
    expect(db.sponsorMonthlyStat.upsert).not.toHaveBeenCalled()
  })

  it('un auspiciador vencido no suma ni redirige a su sitio', async () => {
    db.sponsor.findUnique.mockResolvedValue(sponsor({ endsAt: new Date('2026-01-01') }))
    const res = await click('web')
    expect(res.headers.get('location')).toMatch(/\/kelme$/)
    expect(db.sponsorMonthlyStat.upsert).not.toHaveBeenCalled()
  })

  it('un id inexistente redirige a la portada', async () => {
    db.sponsor.findUnique.mockResolvedValue(null)
    const res = await click('cta')
    expect(res.status).toBe(302)
    expect(new URL(res.headers.get('location')!, 'http://localhost').pathname).toBe('/')
  })

  it('sin enlaces guardados vuelve al landing de la liga', async () => {
    db.sponsor.findUnique.mockResolvedValue(sponsor({ ctaUrl: null, websiteUrl: null }))
    const res = await click('cta')
    expect(res.headers.get('location')).toMatch(/\/kelme$/)
  })
})

describe('vistas de auspiciadores', () => {
  beforeEach(() => vi.clearAllMocks())

  it('solo cuenta auspiciadores visibles de esa organización', async () => {
    db.sponsor.findMany.mockResolvedValue([{ id: 'propio', isActive: true, startsAt: null, endsAt: null }])
    const res = await views({ organizationSlug: 'kelme', sponsorIds: ['propio', 'ajeno'] })
    expect(res.status).toBe(204)
    expect(db.sponsor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['propio', 'ajeno'] }, season: { organization: { slug: 'kelme' } } }),
      }),
    )
    expect(db.sponsorMonthlyStat.upsert).toHaveBeenCalledTimes(1)
    expect(db.sponsorMonthlyStat.upsert.mock.calls[0][0].where.sponsorId_month.sponsorId).toBe('propio')
  })

  it('rechaza más de 20 ids', async () => {
    const res = await views({ organizationSlug: 'kelme', sponsorIds: Array.from({ length: 21 }, (_, i) => `s${i}`) })
    expect(res.status).toBe(400)
  })

  it('no cuenta bots', async () => {
    db.sponsor.findMany.mockResolvedValue([{ id: 'a', isActive: true, startsAt: null, endsAt: null }])
    const res = await views({ organizationSlug: 'kelme', sponsorIds: ['a'] }, 'Googlebot/2.1')
    expect(res.status).toBe(204)
    expect(db.sponsorMonthlyStat.upsert).not.toHaveBeenCalled()
  })
})
