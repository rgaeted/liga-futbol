import { describe, expect, it } from 'vitest'
import {
  FIXTURE_MATCHES,
  FIXTURE_TEAMS,
  fixtureEndAt,
  fixtureStartAt,
} from '@/lib/kelme-fixture/definition'
import {
  matchesPerTeam,
  operationalAlerts,
  validateSchedule,
  type ScheduleMatch,
} from '@/lib/kelme-fixture/schedule'

const RULES = { matchMinutes: 35, latestEnd: fixtureStartAt({ startTime: '12:00' }) }

function fixture(): ScheduleMatch[] {
  return FIXTURE_MATCHES.map((def) => {
    const startAt = fixtureStartAt(def)
    return {
      code: def.code,
      court: def.court,
      startAt,
      endAt: fixtureEndAt(startAt),
      homeTeamId: def.homeKey,
      awayTeamId: def.awayKey,
      phase: def.phase,
    }
  })
}

const find = (code: string) => FIXTURE_MATCHES.find((m) => m.code === code)!

describe('fixture objetivo del 15-11-2026', () => {
  it('coincide con la tabla de horarios y canchas acordada', () => {
    const rows = FIXTURE_MATCHES.map((m) => `${m.startTime} c${m.court}`).sort()
    expect(rows).toEqual(
      [
        '09:00 c1', '09:00 c2', '09:00 c3', '09:00 c4',
        '09:45 c1', '09:45 c2', '09:45 c3', '09:45 c4',
        '10:30 c1', '10:30 c2', '10:30 c3', '10:30 c4',
        '11:15 c1', '11:15 c2', '11:15 c3',
      ].sort(),
    )
  })

  it('no tiene solapamientos de cancha ni de equipos y cada partido dura 35 minutos', () => {
    expect(validateSchedule(fixture(), RULES)).toEqual([])
  })

  it('termina a las 11:50, antes del cierre de las 12:00', () => {
    const lastEnd = Math.max(...fixture().map((m) => m.endAt.getTime()))
    expect(lastEnd).toBe(fixtureStartAt({ startTime: '11:50' }).getTime())
  })

  it('deja la cancha 4 libre durante las definiciones y no agrega partidos extra', () => {
    expect(FIXTURE_MATCHES).toHaveLength(15)
    expect(FIXTURE_MATCHES.filter((m) => m.startTime === '11:15' && m.court === 4)).toHaveLength(0)
  })

  it('Palestino del formato con grupos juega 09:00 y 10:30 y define a las 11:15', () => {
    const palestino = FIXTURE_TEAMS.find((t) => t.name === 'Palestino Puerto Montt' && t.group === 'A')!
    const own = FIXTURE_MATCHES.filter((m) => m.homeKey === palestino.key || m.awayKey === palestino.key)
    expect(own.map((m) => [m.startTime, m.court, m.phase]).sort()).toEqual([
      ['09:00', 1, 'GROUP'],
      ['10:30', 1, 'GROUP'],
    ])
    expect(find('M13').startTime).toBe('11:15')
    expect(find('M01')).toMatchObject({ homeKey: 'g:ue', awayKey: 'g:pmo' })
  })

  it('cada uno de los 10 equipos juega exactamente 3 partidos contando su definición', () => {
    const counts = matchesPerTeam(fixture())
    const groupTeams = FIXTURE_TEAMS.filter((t) => t.group)
    const leagueTeams = FIXTURE_TEAMS.filter((t) => !t.group)
    for (const t of groupTeams) expect(counts.get(t.key)).toBe(2) // + 1 definición por posición
    for (const t of leagueTeams) expect(counts.get(t.key)).toBe(3)
    expect(groupTeams.length + leagueTeams.length).toBe(10)
  })
})

describe('validateSchedule', () => {
  it('detecta solapamiento de cancha con intervalos [inicio, fin)', () => {
    const matches = fixture()
    const m = matches.find((x) => x.code === 'M09')!
    m.startAt = new Date(fixtureStartAt({ startTime: '10:00' }))
    m.endAt = fixtureEndAt(m.startAt)
    expect(validateSchedule(matches, RULES).join(' ')).toContain('se solapan en la cancha 1')
  })

  it('un partido que empieza justo cuando termina otro en la misma cancha no se solapa', () => {
    const a: ScheduleMatch = { code: 'A', court: 1, startAt: new Date('2026-11-15T12:00:00Z'), endAt: new Date('2026-11-15T12:35:00Z'), homeTeamId: 'x', awayTeamId: 'y' }
    const b: ScheduleMatch = { code: 'B', court: 1, startAt: new Date('2026-11-15T12:35:00Z'), endAt: new Date('2026-11-15T13:10:00Z'), homeTeamId: 'z', awayTeamId: 'w' }
    expect(validateSchedule([a, b], RULES)).toEqual([])
  })

  it('detecta un equipo jugando dos partidos a la vez aunque inicien a horas distintas', () => {
    const matches = fixture()
    const m = matches.find((x) => x.code === 'M09')! // Palestino vs Nuevo A
    m.startAt = fixtureStartAt({ startTime: '09:20' }) // solapa con M01 (09:00–09:35) de Palestino
    m.endAt = fixtureEndAt(m.startAt)
    m.court = 4
    expect(validateSchedule(matches, RULES).join(' ')).toContain('un mismo equipo juega dos partidos a la vez')
  })

  it('detecta partidos que no duran 35 minutos o terminan después de las 12:00', () => {
    const matches = fixture()
    const m = matches.find((x) => x.code === 'M13')!
    m.startAt = fixtureStartAt({ startTime: '11:30' })
    m.endAt = fixtureEndAt(m.startAt)
    expect(validateSchedule(matches, RULES).join(' ')).toContain('después del cierre')
    m.endAt = new Date(m.startAt.getTime() + 40 * 60_000)
    expect(validateSchedule(matches, RULES).join(' ')).toContain('dura 40 minutos')
  })
})

describe('operationalAlerts', () => {
  const names = new Map(FIXTURE_TEAMS.map((t) => [t.key, t.name]))

  it('avisa que solo hay 10 minutos entre el último partido de grupos y las definiciones', () => {
    const alerts = operationalAlerts(fixture(), names)
    expect(alerts[0]).toContain('11:05')
    expect(alerts[0]).toContain('11:15')
    expect(alerts[0]).toContain('10 minutos')
  })

  it('muestra los descansos de 10 minutos de Unión Española sin prometer pausas más largas', () => {
    const alerts = operationalAlerts(fixture(), names).join(' ')
    expect(alerts).toContain('Unión Española (10 min)')
  })

  it('no avisa cuando hay margen suficiente', () => {
    const matches = fixture().filter((m) => m.code === 'M09' || m.code === 'M13')
    matches.find((m) => m.code === 'M13')!.startAt = fixtureStartAt({ startTime: '12:00' })
    const alerts = operationalAlerts(matches, names)
    expect(alerts).toEqual([])
  })
})
