import { describe, expect, it } from 'vitest'
import { evaluarBadgesDePartido } from '@/lib/badges/evaluate'
import { BADGE_REGISTRY } from '@/lib/badges/registry'
import type { BadgeMatch, BadgeCatalogRow } from '@/lib/badges/types'

const catalog: BadgeCatalogRow[] = BADGE_REGISTRY.filter((d) => d.evaluable).map((d) => ({
  predicateId: d.predicateId,
  thresholds: d.defaultThresholds,
  isActive: true,
}))

function emptyHistory() {
  return {
    priorMatches: [],
    alreadyHasPredicateIds: [],
    yearHasCaballero: false,
    yearHasTarjetero: false,
    laterSameYearExists: false,
  }
}

function match(partial: Partial<BadgeMatch> & Pick<BadgeMatch, 'events' | 'roster'>): BadgeMatch {
  return {
    id: 'm1',
    scheduledAt: new Date('2026-09-07T23:30:00.000Z'),
    sideAName: 'Blancos',
    sideBName: 'Negros',
    mvpPlayerIds: [],
    ...partial,
  }
}

describe('evaluarBadgesDePartido', () => {
  it('awards hat_trick at 3 goals and poker at 4 in the same night', () => {
    const m = match({
      roster: [{ playerId: 'opitz', side: 'A' }],
      events: [1, 2, 3, 4].map((n) => ({
        id: `g${n}`,
        type: 'GOAL',
        minute: n * 10,
        playerId: 'opitz',
        assistPlayerId: null,
        side: 'A' as const,
      })),
    })
    const awards = evaluarBadgesDePartido(m, catalog, { opitz: emptyHistory() })
    const ids = awards.filter((a) => a.playerId === 'opitz').map((a) => a.predicateId)
    expect(ids).toContain('hat_trick')
    expect(ids).toContain('poker')
  })

  it('does not count own goals toward hat_trick or primer_gol', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [
        { id: 'o', type: 'OWN_GOAL', minute: 10, playerId: 'p', assistPlayerId: null, side: 'A' },
        { id: 'g', type: 'GOAL', minute: 20, playerId: 'p', assistPlayerId: null, side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, { p: emptyHistory() })
    const ids = awards.map((a) => a.predicateId)
    expect(ids).toContain('en_contra')
    expect(ids).toContain('primer_gol')
    expect(ids).not.toContain('hat_trick')
  })

  it('does not award primer_gol when already earned', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [
        { id: 'g', type: 'GOAL', minute: 20, playerId: 'p', assistPlayerId: null, side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), alreadyHasPredicateIds: ['primer_gol'] },
    })
    expect(awards.map((a) => a.predicateId)).not.toContain('primer_gol')
  })

  it('awards gol_ultima_hora for a 58 min winner at 5-4', () => {
    const m = match({
      roster: [
        { playerId: 'opitz', side: 'A' },
        { playerId: 'x', side: 'B' },
      ],
      events: [
        { id: 'b1', type: 'GOAL', minute: 10, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b2', type: 'GOAL', minute: 20, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b3', type: 'GOAL', minute: 25, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b4', type: 'GOAL', minute: 30, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'a1', type: 'GOAL', minute: 35, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a2', type: 'GOAL', minute: 40, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a3', type: 'GOAL', minute: 45, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a4', type: 'GOAL', minute: 50, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'win', type: 'GOAL', minute: 58, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'ft', type: 'FULLTIME', minute: 60, playerId: null, assistPlayerId: null, side: null },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      opitz: emptyHistory(),
      x: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'opitz' && a.predicateId === 'gol_ultima_hora')).toBe(
      true,
    )
  })

  it('awards el_show to MVPs', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
      mvpPlayerIds: ['p'],
    })
    const awards = evaluarBadgesDePartido(m, catalog, { p: emptyHistory() })
    expect(awards.some((a) => a.predicateId === 'el_show')).toBe(true)
  })

  it('does not award de_todos_los_sabores even if listed active', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
    })
    const awards = evaluarBadgesDePartido(
      m,
      [...catalog, { predicateId: 'de_todos_los_sabores', thresholds: {}, isActive: true }],
      { p: emptyHistory() },
    )
    expect(awards.map((a) => a.predicateId)).not.toContain('de_todos_los_sabores')
  })

  it('awards abrio_la_lata to the first scorer', () => {
    const m = match({
      roster: [
        { playerId: 'scorer', side: 'A' },
        { playerId: 'other', side: 'B' },
      ],
      events: [
        { id: 'g1', type: 'GOAL', minute: 10, playerId: 'scorer', assistPlayerId: null, side: 'A' },
        { id: 'g2', type: 'GOAL', minute: 20, playerId: 'other', assistPlayerId: null, side: 'B' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      scorer: emptyHistory(),
      other: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'scorer' && a.predicateId === 'abrio_la_lata')).toBe(true)
    expect(awards.some((a) => a.predicateId === 'abrio_la_lata')).toBe(true)
  })

  it('awards arquitecto for 3 assists', () => {
    const m = match({
      roster: [
        { playerId: 'creator', side: 'A' },
        { playerId: 'finisher', side: 'A' },
      ],
      events: [1, 2, 3].map((n) => ({
        id: `g${n}`,
        type: 'GOAL',
        minute: n * 10,
        playerId: 'finisher',
        assistPlayerId: 'creator',
        side: 'A' as const,
      })),
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      creator: emptyHistory(),
      finisher: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'creator' && a.predicateId === 'arquitecto')).toBe(
      true,
    )
  })

  it('awards taco_de_oro for a goal and an assist', () => {
    const m = match({
      roster: [
        { playerId: 'p', side: 'A' },
        { playerId: 'mate', side: 'A' },
      ],
      events: [
        { id: 'g1', type: 'GOAL', minute: 10, playerId: 'mate', assistPlayerId: 'p', side: 'A' },
        { id: 'g2', type: 'GOAL', minute: 20, playerId: 'p', assistPlayerId: null, side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: emptyHistory(),
      mate: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'p' && a.predicateId === 'taco_de_oro')).toBe(true)
  })

  it('awards bandeja_de_plata for at least one assist', () => {
    const m = match({
      roster: [
        { playerId: 'p', side: 'A' },
        { playerId: 'mate', side: 'A' },
      ],
      events: [
        { id: 'g1', type: 'GOAL', minute: 10, playerId: 'mate', assistPlayerId: 'p', side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: emptyHistory(),
      mate: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'p' && a.predicateId === 'bandeja_de_plata')).toBe(
      true,
    )
  })

  it('awards sociedad for 3 assists to the same scorer', () => {
    const m = match({
      roster: [
        { playerId: 'p', side: 'A' },
        { playerId: 'finisher', side: 'A' },
      ],
      events: [1, 2, 3].map((n) => ({
        id: `g${n}`,
        type: 'GOAL',
        minute: n * 10,
        playerId: 'finisher',
        assistPlayerId: 'p',
        side: 'A' as const,
      })),
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: emptyHistory(),
      finisher: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'p' && a.predicateId === 'sociedad')).toBe(true)
  })

  it('awards valla_invicta to a keeper on a clean sheet', () => {
    const m = match({
      roster: [
        { playerId: 'keeper', side: 'A', primaryPosition: 'Arquero' },
        { playerId: 'striker', side: 'B' },
      ],
      events: [
        { id: 'g1', type: 'GOAL', minute: 10, playerId: 'keeper', assistPlayerId: null, side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      keeper: emptyHistory(),
      striker: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'keeper' && a.predicateId === 'valla_invicta')).toBe(
      true,
    )
  })

  it('awards muro to a winning keeper conceding at most one', () => {
    const m = match({
      roster: [
        { playerId: 'keeper', side: 'A', primaryPosition: 'Arquero' },
        { playerId: 'striker', side: 'B' },
      ],
      events: [
        { id: 'a1', type: 'GOAL', minute: 10, playerId: 'keeper', assistPlayerId: null, side: 'A' },
        { id: 'a2', type: 'GOAL', minute: 20, playerId: 'keeper', assistPlayerId: null, side: 'A' },
        { id: 'b1', type: 'GOAL', minute: 30, playerId: 'striker', assistPlayerId: null, side: 'B' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      keeper: emptyHistory(),
      striker: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'keeper' && a.predicateId === 'muro')).toBe(true)
  })

  it('does not award inactive catalog badges', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [1, 2, 3].map((n) => ({
        id: `g${n}`,
        type: 'GOAL',
        minute: n * 10,
        playerId: 'p',
        assistPlayerId: null,
        side: 'A' as const,
      })),
    })
    const inactiveCatalog = catalog.map((row) =>
      row.predicateId === 'hat_trick' ? { ...row, isActive: false } : row,
    )
    const awards = evaluarBadgesDePartido(m, inactiveCatalog, { p: emptyHistory() })
    expect(awards.map((a) => a.predicateId)).not.toContain('hat_trick')
  })

  it('awards nunca_falla on the 8th consecutive presence', () => {
    const prior = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      scheduledAt: new Date(`2026-07-0${i + 1}T23:00:00.000Z`),
      played: true,
      goles: 0,
      asistencias: 0,
      amarillas: 0,
      rojas: 0,
    }))
    const m = match({
      id: 'm8',
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior, laterSameYearExists: true },
    })
    expect(awards.some((a) => a.predicateId === 'nunca_falla')).toBe(true)
  })

  it('awards club_50 when this match crosses 50 career goals', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [{ id: 'g', type: 'GOAL', minute: 10, playerId: 'p', assistPlayerId: null, side: 'A' }],
    })
    const prior = [
      {
        id: 'old',
        scheduledAt: new Date('2026-01-05T23:00:00.000Z'),
        played: true,
        goles: 49,
        asistencias: 0,
        amarillas: 0,
        rojas: 0,
      },
    ]
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior },
    })
    expect(awards.some((a) => a.predicateId === 'club_50')).toBe(true)
  })

  it('skips caballero when laterSameYearExists is true', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
      scheduledAt: new Date('2026-11-30T23:00:00.000Z'),
    })
    const prior = [
      {
        id: 'prev',
        scheduledAt: new Date('2026-03-10T23:00:00.000Z'),
        played: true,
        goles: 0,
        asistencias: 0,
        amarillas: 0,
        rojas: 0,
      },
    ]
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior, laterSameYearExists: true },
    })
    expect(awards.some((a) => a.predicateId === 'caballero')).toBe(false)
  })

  it('awards caballero when laterSameYearExists is false with zero cards and at least one PJ', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
      scheduledAt: new Date('2026-11-30T23:00:00.000Z'),
    })
    const prior = [
      {
        id: 'prev',
        scheduledAt: new Date('2026-03-10T23:00:00.000Z'),
        played: true,
        goles: 0,
        asistencias: 0,
        amarillas: 0,
        rojas: 0,
      },
    ]
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior, laterSameYearExists: false },
    })
    expect(awards.some((a) => a.predicateId === 'caballero')).toBe(true)
  })
})
