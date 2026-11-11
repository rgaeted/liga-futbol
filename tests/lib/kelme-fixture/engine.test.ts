import { describe, expect, it } from 'vitest'
import {
  FIXTURE_MATCHES,
  FIXTURE_TEAMS,
  fixtureEndAt,
  fixtureStartAt,
} from '@/lib/kelme-fixture/definition'
import { recalculateFixture, type FixtureTeam } from '@/lib/kelme-fixture/engine'
import type { FixtureMatch, FixtureStatus } from '@/lib/kelme-fixture/types'

const teams: FixtureTeam[] = FIXTURE_TEAMS.map((def, index) => ({
  id: def.key,
  name: def.name,
  category: def.category,
  group: def.group,
  sortOrder: index,
}))

function buildMatches(): FixtureMatch[] {
  return FIXTURE_MATCHES.map((def) => {
    const startAt = fixtureStartAt(def)
    return {
      id: def.code,
      code: def.code,
      category: def.category,
      phase: def.phase,
      group: def.group,
      court: def.court,
      startAt,
      endAt: fixtureEndAt(startAt),
      homeTeamId: def.homeKey,
      awayTeamId: def.awayKey,
      homeSlot: def.homeSlot,
      awaySlot: def.awaySlot,
      homeGoals: 0,
      awayGoals: 0,
      status: 'SCHEDULED' as FixtureStatus,
      decidedBy: null,
      penaltyHome: null,
      penaltyAway: null,
    }
  })
}

function setResult(
  matches: FixtureMatch[],
  code: string,
  homeGoals: number,
  awayGoals: number,
  status: FixtureStatus = 'FINAL',
) {
  const match = matches.find((m) => m.code === code)!
  match.homeGoals = homeGoals
  match.awayGoals = awayGoals
  match.status = status
}

/** Resultados que dejan Grupo A: UE > PMO > Nuevo A y Grupo B: 21M > Austral > Nuevo B. */
function finishGroups(matches: FixtureMatch[]) {
  setResult(matches, 'M01', 2, 0) // UE vs PMO
  setResult(matches, 'M05', 3, 0) // UE vs Nuevo A
  setResult(matches, 'M09', 1, 0) // PMO vs Nuevo A
  setResult(matches, 'M02', 2, 1) // 21M vs Austral
  setResult(matches, 'M06', 4, 0) // 21M vs Nuevo B
  setResult(matches, 'M10', 1, 0) // Austral vs Nuevo B
}

describe('definición del fixture', () => {
  it('contiene 15 partidos únicos: 9 de 2017-2016 y 6 de 2019-2018', () => {
    expect(FIXTURE_MATCHES).toHaveLength(15)
    expect(new Set(FIXTURE_MATCHES.map((m) => m.code)).size).toBe(15)
    expect(FIXTURE_MATCHES.filter((m) => m.category === '2017-2016')).toHaveLength(9)
    expect(FIXTURE_MATCHES.filter((m) => m.category === '2019-2018')).toHaveLength(6)
  })

  it('termina a más tardar a las 11:50 con máximo cuatro canchas en paralelo', () => {
    const matches = buildMatches()
    const lastEnd = Math.max(...matches.map((m) => m.endAt.getTime()))
    expect(lastEnd).toBe(fixtureStartAt({ startTime: '11:50' }).getTime())
    const bySlot = new Map<number, number[]>()
    for (const m of matches) {
      bySlot.set(m.startAt.getTime(), [...(bySlot.get(m.startAt.getTime()) ?? []), m.court])
    }
    for (const courts of bySlot.values()) {
      expect(courts.length).toBeLessThanOrEqual(4)
      expect(new Set(courts).size).toBe(courts.length)
    }
  })

  it('interpreta los horarios en America/Santiago (UTC-3 el 15 de noviembre de 2026)', () => {
    expect(fixtureStartAt({ startTime: '09:00' }).toISOString()).toBe('2026-11-15T12:00:00.000Z')
  })

  it('ningún equipo tiene dos partidos simultáneos', () => {
    const matches = buildMatches().filter((m) => m.homeTeamId && m.awayTeamId)
    const seen = new Set<string>()
    for (const m of matches) {
      for (const id of [m.homeTeamId!, m.awayTeamId!]) {
        const key = `${id}@${m.startAt.getTime()}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('los 6 equipos de 2017-2016 juegan 2 partidos de grupo y los 4 de 2019-2018 juegan 3', () => {
    const matches = buildMatches()
    const count = (id: string) =>
      matches.filter((m) => m.homeTeamId === id || m.awayTeamId === id).length
    for (const team of teams.filter((t) => t.category === '2017-2016')) {
      expect(count(team.id)).toBe(2)
    }
    for (const team of teams.filter((t) => t.category === '2019-2018')) {
      expect(count(team.id)).toBe(3)
    }
  })

  it('equipos homónimos de distintas categorías tienen identidad distinta', () => {
    const ue = teams.filter((t) => t.name === 'Unión Española')
    expect(ue).toHaveLength(2)
    expect(new Set(ue.map((t) => t.id)).size).toBe(2)
  })
})

describe('recalculateFixture', () => {
  it('con resultados parciales actualiza tablas pero deja M13–M15 por definir', () => {
    const matches = buildMatches()
    setResult(matches, 'M01', 2, 0)
    setResult(matches, 'M02', 1, 0)
    const state = recalculateFixture({ teams, matches })
    expect(state.standings.A.rows[0].teamId).toBe('g:ue')
    expect(state.plan.ready).toBe(false)
    expect(state.plan.assignments).toEqual([])
  })

  it('con todos los grupos finalizados cruza 1.º, 2.º y 3.º de cada grupo', () => {
    const matches = buildMatches()
    finishGroups(matches)
    const { plan } = recalculateFixture({ teams, matches })
    expect(plan.ready).toBe(true)
    expect(plan.assignments).toEqual([
      { code: 'M13', homeTeamId: 'g:ue', awayTeamId: 'g:21m' },
      { code: 'M14', homeTeamId: 'g:pmo', awayTeamId: 'g:austral' },
      { code: 'M15', homeTeamId: 'g:nuevoA', awayTeamId: 'g:nuevoB' },
    ])
  })

  it('es idempotente: sin cambios no genera nuevas asignaciones ni partidos', () => {
    const matches = buildMatches()
    finishGroups(matches)
    const first = recalculateFixture({ teams, matches })
    for (const a of first.plan.assignments) {
      const m = matches.find((x) => x.code === a.code)!
      m.homeTeamId = a.homeTeamId
      m.awayTeamId = a.awayTeamId
    }
    const second = recalculateFixture({ teams, matches })
    expect(second.plan.assignments).toEqual([])
    expect(matches).toHaveLength(15)
  })

  it('al corregir un resultado antes de las definiciones actualiza los cruces', () => {
    const matches = buildMatches()
    finishGroups(matches)
    for (const a of recalculateFixture({ teams, matches }).plan.assignments) {
      const m = matches.find((x) => x.code === a.code)!
      m.homeTeamId = a.homeTeamId
      m.awayTeamId = a.awayTeamId
    }
    // Palestino le gana a Unión Española 3-0 (antes perdía 0-2): cambia el 1.º del grupo A.
    setResult(matches, 'M01', 0, 3)
    const { plan } = recalculateFixture({ teams, matches })
    expect(plan.assignments.find((a) => a.code === 'M13')).toEqual({
      code: 'M13',
      homeTeamId: 'g:pmo',
      awayTeamId: 'g:21m',
    })
  })

  it('si se invalida un partido de grupo los cruces vuelven a por definir', () => {
    const matches = buildMatches()
    finishGroups(matches)
    for (const a of recalculateFixture({ teams, matches }).plan.assignments) {
      const m = matches.find((x) => x.code === a.code)!
      m.homeTeamId = a.homeTeamId
      m.awayTeamId = a.awayTeamId
    }
    setResult(matches, 'M01', 0, 0, 'SCHEDULED')
    const { plan } = recalculateFixture({ teams, matches })
    expect(plan.ready).toBe(false)
    expect(plan.assignments).toEqual([
      { code: 'M13', homeTeamId: null, awayTeamId: null },
      { code: 'M14', homeTeamId: null, awayTeamId: null },
      { code: 'M15', homeTeamId: null, awayTeamId: null },
    ])
  })

  it('no reasigna equipos si una definición ya comenzó y avisa del conflicto', () => {
    const matches = buildMatches()
    finishGroups(matches)
    for (const a of recalculateFixture({ teams, matches }).plan.assignments) {
      const m = matches.find((x) => x.code === a.code)!
      m.homeTeamId = a.homeTeamId
      m.awayTeamId = a.awayTeamId
    }
    setResult(matches, 'M13', 0, 0, 'IN_PROGRESS')
    setResult(matches, 'M01', 0, 3) // cambia la clasificación del grupo A
    const { plan } = recalculateFixture({ teams, matches })
    expect(plan.locked).toBe(true)
    expect(plan.assignments).toEqual([])
    expect(plan.conflict?.codes).toContain('M13')
  })

  it('un empate irresuelto bloquea los cruces y no elige finalistas', () => {
    const matches = buildMatches()
    // Grupo A: todos empatan 0-0 → tres equipos igualados sin criterio resolutivo.
    setResult(matches, 'M01', 0, 0)
    setResult(matches, 'M05', 0, 0)
    setResult(matches, 'M09', 0, 0)
    setResult(matches, 'M02', 2, 1)
    setResult(matches, 'M06', 4, 0)
    setResult(matches, 'M10', 1, 0)
    const { plan, standings } = recalculateFixture({ teams, matches })
    expect(standings.A.definitive).toBe(false)
    expect(plan.ready).toBe(false)
    expect(plan.pendingTie.A).toBe(true)
    expect(plan.assignments).toEqual([])
  })

  it('un orden manual aprobado resuelve el empate y habilita los cruces', () => {
    const matches = buildMatches()
    setResult(matches, 'M01', 0, 0)
    setResult(matches, 'M05', 0, 0)
    setResult(matches, 'M09', 0, 0)
    setResult(matches, 'M02', 2, 1)
    setResult(matches, 'M06', 4, 0)
    setResult(matches, 'M10', 1, 0)
    const { plan } = recalculateFixture({
      teams,
      matches,
      config: {
        definitionDrawPolicy: 'PENALTIES_REQUIRED',
        manualRanking: {
          A: { teamIds: ['g:nuevoA', 'g:ue', 'g:pmo'], reason: 'Sorteo reglamentario' },
        },
      },
    })
    expect(plan.ready).toBe(true)
    expect(plan.assignments.find((a) => a.code === 'M13')).toMatchObject({
      homeTeamId: 'g:nuevoA',
      awayTeamId: 'g:21m',
    })
  })

  it('los equipos homónimos de otra categoría no mezclan puntos ni goles', () => {
    const matches = buildMatches()
    setResult(matches, 'M03', 5, 0) // UE (liga 2019-2018) vs 21 de Mayo
    const { standings } = recalculateFixture({ teams, matches })
    const ueGroups = standings.A.rows.find((r) => r.teamId === 'g:ue')!
    const ueLeague = standings.league.rows.find((r) => r.teamId === 'l:ue')!
    expect(ueGroups.pts).toBe(0)
    expect(ueLeague.pts).toBe(3)
    expect(ueLeague.gf).toBe(5)
  })

  it('los resultados de definición no alteran las tablas de grupo', () => {
    const matches = buildMatches()
    finishGroups(matches)
    const before = recalculateFixture({ teams, matches }).standings.A.rows
    const m13 = matches.find((m) => m.code === 'M13')!
    m13.homeTeamId = 'g:ue'
    m13.awayTeamId = 'g:21m'
    setResult(matches, 'M13', 7, 0)
    const after = recalculateFixture({ teams, matches }).standings.A.rows
    expect(after).toEqual(before)
  })

  it('deriva las posiciones 1.º a 6.º desde M13, M14 y M15', () => {
    const matches = buildMatches()
    finishGroups(matches)
    for (const a of recalculateFixture({ teams, matches }).plan.assignments) {
      const m = matches.find((x) => x.code === a.code)!
      m.homeTeamId = a.homeTeamId
      m.awayTeamId = a.awayTeamId
    }
    setResult(matches, 'M13', 1, 0)
    setResult(matches, 'M14', 0, 2)
    setResult(matches, 'M15', 3, 3)
    const { positions } = recalculateFixture({ teams, matches })
    expect(positions.map((p) => [p.position, p.teamId])).toEqual([
      [1, 'g:ue'],
      [2, 'g:21m'],
      [3, 'g:austral'],
      [4, 'g:pmo'],
    ])
  })
})
