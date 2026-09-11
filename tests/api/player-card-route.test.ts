import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/players/[id]/card/route'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/player-card-query', () => ({
  getLosLunesPlayerCard: vi.fn(),
}))

import { getLosLunesPlayerCard } from '@/lib/player-card-query'

describe('GET /api/players/[id]/card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when the player is not a Los Lunes card', async () => {
    vi.mocked(getLosLunesPlayerCard).mockResolvedValue({ kind: 'not_found' })
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 503 when the org is paused', async () => {
    vi.mocked(getLosLunesPlayerCard).mockResolvedValue({ kind: 'paused' })
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(503)
  })

  it('returns the card payload', async () => {
    vi.mocked(getLosLunesPlayerCard).mockResolvedValue({
      kind: 'ok',
      card: {
        player: {
          id: 'p1',
          nombre: 'Fernando Opitz',
          nombreCorto: 'F. Opitz',
          posicion: 'DEL',
          equipo: 'Blancos',
          fotoUrl: '/api/players/p1/photo',
          escudoUrl: '/branding/loslunes-logo.png',
          premio: null,
        },
        ventana: {
          dias: 30,
          desde: '2026-08-12',
          hasta: '2026-09-11',
          fechasPosibles: 5,
          pj: 3,
          minPj: 2,
        },
        crudos: {
          goles: 7,
          asistencias: 5,
          presencias: 3,
          mvps: 2,
          amarillas: 1,
          rojas: 0,
          rachaGoleadora: 3,
          rachaPresencia: 5,
        },
        atributos: { TIR: 88, VIS: 82, RES: 90, REG: 74, RIT: 79, FIS: 71 },
        ovr: 86,
        estado: 'completa',
        partidosFaltantes: 0,
      },
    })
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ovr: 86, estado: 'completa' })
  })
})
