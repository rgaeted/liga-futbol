import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const db = vi.hoisted(() => ({
  season: { findUnique: vi.fn() },
  sponsor: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  sponsorAssignment: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  sponsorMonthlyStat: { findMany: vi.fn() },
  match: { findMany: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db }))

import {
  createSponsor,
  listSponsorAssignmentSlots,
  listSponsorStats,
  setSponsorAssignment,
  updateSponsor,
} from '@/lib/editorial/sponsors'

describe('campos de landing del auspiciador', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createSponsor guarda nivel, frase, botón y visibilidad en el landing', async () => {
    db.season.findUnique.mockResolvedValue({ organizationId: 'org-1' })
    db.sponsor.create.mockResolvedValue({ id: 's1' })
    await createSponsor('season-1', {
      name: 'Ferretería X',
      tier: 'MAIN',
      tagline: '10 % para jugadores',
      ctaLabel: 'Escríbenos',
      ctaUrl: 'https://wa.me/1',
      showOnLanding: true,
    })
    expect(db.sponsor.create.mock.calls[0][0].data).toMatchObject({
      tier: 'MAIN',
      tagline: '10 % para jugadores',
      ctaLabel: 'Escríbenos',
      ctaUrl: 'https://wa.me/1',
      showOnLanding: true,
    })
  })

  it('updateSponsor solo cambia los campos presentes', async () => {
    db.sponsor.findFirst.mockResolvedValue({ id: 's1' })
    db.sponsor.update.mockResolvedValue({ id: 's1' })
    await updateSponsor('season-1', 's1', { showOnLanding: true })
    expect(db.sponsor.update.mock.calls[0][0].data).toEqual({ showOnLanding: true })
  })
})

describe('listSponsorAssignmentSlots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lista canchas distintas y fases de definición presentes, con su auspiciador', async () => {
    db.match.findMany.mockResolvedValue([
      { court: 2, phase: 'GROUP' },
      { court: 1, phase: 'FINAL' },
      { court: null, phase: null },
      { court: 2, phase: 'THIRD_PLACE' },
    ])
    db.sponsorAssignment.findMany.mockResolvedValue([{ target: 'court:1', sponsorId: 'sp1' }])
    const slots = await listSponsorAssignmentSlots('season-1')
    expect(slots).toEqual([
      { target: 'court:1', label: 'Cancha 1', sponsorId: 'sp1' },
      { target: 'court:2', label: 'Cancha 2', sponsorId: null },
      { target: 'phase:FINAL', label: 'Final', sponsorId: null },
      { target: 'phase:THIRD_PLACE', label: '3.er puesto', sponsorId: null },
    ])
  })

  it('devuelve una lista vacía si la temporada no tiene canchas ni definiciones', async () => {
    db.match.findMany.mockResolvedValue([{ court: null, phase: 'LEAGUE' }])
    db.sponsorAssignment.findMany.mockResolvedValue([])
    expect(await listSponsorAssignmentSlots('season-1')).toEqual([])
  })
})

describe('setSponsorAssignment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechaza un auspiciador de otra temporada', async () => {
    db.sponsor.findFirst.mockResolvedValue(null)
    expect(await setSponsorAssignment('season-1', { target: 'court:1', sponsorId: 'ajeno' })).toBe('not_found')
    expect(db.sponsorAssignment.upsert).not.toHaveBeenCalled()
  })

  it('crea o reemplaza la asignación por (temporada, target)', async () => {
    db.sponsor.findFirst.mockResolvedValue({ id: 'sp1' })
    expect(await setSponsorAssignment('season-1', { target: 'court:1', sponsorId: 'sp1' })).toBe('ok')
    expect(db.sponsorAssignment.upsert.mock.calls[0][0].where).toEqual({
      seasonId_target: { seasonId: 'season-1', target: 'court:1' },
    })
  })

  it('con sponsorId null quita la asignación', async () => {
    expect(await setSponsorAssignment('season-1', { target: 'phase:FINAL', sponsorId: null })).toBe('ok')
    expect(db.sponsorAssignment.deleteMany).toHaveBeenCalledWith({
      where: { seasonId: 'season-1', target: 'phase:FINAL' },
    })
  })
})

describe('listSponsorStats', () => {
  it('separa el mes actual del anterior', async () => {
    db.sponsorMonthlyStat.findMany.mockResolvedValue([
      { sponsorId: 'sp1', month: new Date('2026-11-01T03:00:00.000Z'), views: 10, clicks: 3 },
      { sponsorId: 'sp1', month: new Date('2026-10-01T03:00:00.000Z'), views: 7, clicks: 1 },
    ])
    const stats = await listSponsorStats('season-1', new Date('2026-11-12T12:00:00Z'))
    expect(stats.sp1).toEqual({
      current: { views: 10, clicks: 3 },
      previous: { views: 7, clicks: 1 },
    })
  })
})
