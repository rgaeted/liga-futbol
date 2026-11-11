import { describe, expect, it } from 'vitest'
import { calculateStandings, type StandingsMatch } from '@/lib/kelme-fixture/standings'

const fin = (home: string, away: string, hg: number, ag: number): StandingsMatch => ({
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  status: 'FINAL',
})

describe('calculateStandings', () => {
  const teams = ['a', 'b', 'c']

  it('suma 3 por victoria, 1 por empate y calcula PJ/PG/PE/PP/GF/GC/DG', () => {
    const result = calculateStandings({
      teamIds: teams,
      matches: [fin('a', 'b', 2, 0), fin('a', 'c', 1, 1), fin('b', 'c', 0, 3)],
    })
    expect(result.rows.map((r) => r.teamId)).toEqual(['c', 'a', 'b'])
    expect(result.rows.find((r) => r.teamId === 'a')).toMatchObject({
      pj: 2,
      pg: 1,
      pe: 1,
      pp: 0,
      gf: 3,
      gc: 1,
      dg: 2,
      pts: 4,
    })
    expect(result.complete).toBe(true)
    expect(result.definitive).toBe(true)
  })

  it('ignora partidos que no están finalizados', () => {
    const result = calculateStandings({
      teamIds: teams,
      matches: [
        fin('a', 'b', 2, 0),
        { homeTeamId: 'a', awayTeamId: 'c', homeGoals: 5, awayGoals: 0, status: 'IN_PROGRESS' },
        { homeTeamId: 'b', awayTeamId: 'c', homeGoals: 0, awayGoals: 0, status: 'SCHEDULED' },
      ],
    })
    expect(result.rows.find((r) => r.teamId === 'a')!.pj).toBe(1)
    expect(result.rows.find((r) => r.teamId === 'c')!.pj).toBe(0)
    expect(result.complete).toBe(false)
    expect(result.definitive).toBe(false)
  })

  it('desempata por diferencia de goles', () => {
    const result = calculateStandings({
      teamIds: teams,
      // a: 3 pts, DG +2 | b: 3 pts, DG -2 | c: 3 pts, DG 0
      matches: [fin('a', 'b', 3, 0), fin('b', 'c', 1, 0), fin('c', 'a', 1, 0)],
    })
    expect(result.rows.map((r) => r.teamId)).toEqual(['a', 'c', 'b'])
    expect(result.definitive).toBe(true)
  })

  it('desempata por goles a favor cuando la diferencia es igual', () => {
    const result = calculateStandings({
      teamIds: teams,
      // b: 3 pts, GF 2, GC 1 (+1) | c: 3 pts, GF 3, GC 2 (+1) | a: 3 pts, GF 1, GC 3 (-2)
      matches: [fin('a', 'b', 1, 0), fin('a', 'c', 0, 3), fin('b', 'c', 2, 0)],
    })
    expect(result.rows.map((r) => r.teamId)).toEqual(['c', 'b', 'a'])
    expect(result.definitive).toBe(true)
  })

  it('un empate de tres equipos sin criterio resolutivo queda pendiente', () => {
    const result = calculateStandings({
      teamIds: teams,
      matches: [fin('a', 'b', 1, 0), fin('b', 'c', 1, 0), fin('c', 'a', 1, 0)],
    })
    expect(result.definitive).toBe(false)
    expect(result.rows.every((r) => r.tied && r.rank === 1)).toBe(true)
  })

  it('resuelve un empate de exactamente dos por enfrentamiento directo', () => {
    const result = calculateStandings({
      teamIds: ['a', 'b', 'c', 'd'],
      // a y b: 6 pts, GF 2, GC 1. a le ganó a b. c: 4 pts. d: 1 pt.
      matches: [
        fin('a', 'b', 1, 0),
        fin('a', 'c', 0, 1),
        fin('a', 'd', 1, 0),
        fin('b', 'c', 1, 0),
        fin('b', 'd', 1, 0),
        fin('c', 'd', 0, 0),
      ],
    })
    expect(result.rows.map((r) => r.teamId)).toEqual(['a', 'b', 'c', 'd'])
    expect(result.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4])
    expect(result.definitive).toBe(true)
  })

  it('dos equipos igualados con el directo empatado quedan pendientes', () => {
    const result = calculateStandings({
      teamIds: teams,
      // c: 6 pts. a y b: 1 pt, DG -1, GF 1 y empataron entre sí.
      matches: [fin('a', 'b', 1, 1), fin('a', 'c', 0, 1), fin('b', 'c', 0, 1)],
    })
    expect(result.rows[0].teamId).toBe('c')
    expect(result.rows[1]).toMatchObject({ tied: true, rank: 2 })
    expect(result.rows[2]).toMatchObject({ tied: true, rank: 2 })
    expect(result.definitive).toBe(false)
    expect([...result.unresolvedTeamIds].sort()).toEqual(['a', 'b'])
  })

  it('aplica el orden manual aprobado solo a los equipos empatados', () => {
    const result = calculateStandings({
      teamIds: teams,
      matches: [fin('a', 'b', 1, 1), fin('a', 'c', 0, 1), fin('b', 'c', 0, 1)],
      manualOrder: ['b', 'a'],
    })
    expect(result.rows.map((r) => r.teamId)).toEqual(['c', 'b', 'a'])
    expect(result.rows.map((r) => r.rank)).toEqual([1, 2, 3])
    expect(result.definitive).toBe(true)
  })

  it('no desempata por orden alfabético ni por id', () => {
    const result = calculateStandings({
      teamIds: ['z', 'y', 'x'],
      matches: [fin('z', 'y', 0, 0), fin('z', 'x', 0, 0), fin('y', 'x', 0, 0)],
    })
    expect(result.definitive).toBe(false)
    expect(result.rows.map((r) => r.teamId)).toEqual(['z', 'y', 'x'])
    expect(result.rows.every((r) => r.rank === 1 && r.tied)).toBe(true)
  })

  it('un orden manual incompleto no resuelve el empate', () => {
    const result = calculateStandings({
      teamIds: teams,
      matches: [fin('a', 'b', 0, 0), fin('a', 'c', 0, 0), fin('b', 'c', 0, 0)],
      manualOrder: ['a', 'b'],
    })
    expect(result.definitive).toBe(false)
  })

  it('no mezcla equipos que no pertenecen a la tabla', () => {
    const result = calculateStandings({
      teamIds: ['a', 'b'],
      matches: [fin('a', 'b', 1, 0), fin('a', 'zzz', 9, 0)],
    })
    expect(result.rows.find((r) => r.teamId === 'a')!.gf).toBe(1)
  })

  it('la liga de 4 equipos está completa con 6 partidos finalizados', () => {
    const result = calculateStandings({
      teamIds: ['a', 'b', 'c', 'd'],
      matches: [
        fin('a', 'b', 1, 0),
        fin('c', 'd', 2, 0),
        fin('a', 'c', 1, 0),
        fin('b', 'd', 1, 0),
        fin('a', 'd', 3, 0),
        fin('b', 'c', 0, 1),
      ],
    })
    expect(result.complete).toBe(true)
    expect(result.rows.map((r) => r.teamId)).toEqual(['a', 'c', 'b', 'd'])
  })
})
