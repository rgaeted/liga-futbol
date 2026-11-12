import { FIXTURE_MATCH_MINUTES, fixtureStartAt, slotLabel, PHASE_LABELS } from './definition'
import { operationalAlerts, validateSchedule } from './schedule'
import { recalculateFixture, type FixtureTeam } from './engine'
import type { StandingRow } from './standings'
import {
  DEFAULT_FIXTURE_CONFIG,
  type CategoryCode,
  type DecidedBy,
  type FixtureConfig,
  type FixtureMatch,
  type FixturePhase,
  type FixtureStatus,
  type GroupCode,
  type TableKey,
  GROUPS_CATEGORY,
  LEAGUE_CATEGORY,
} from './types'
import { formatScheduleTimeLabel } from '@/lib/schedule-datetime'

export type FixtureSnapshot = {
  seasonId: string
  seasonName: string
  config: FixtureConfig
  teams: Array<FixtureTeam & { color: string | null; crestUrl: string | null }>
  matches: Array<FixtureMatch & { updatedAt: Date }>
}

export type FixtureViewSide = {
  teamId: string | null
  name: string
  /** Color del equipo configurado en la administración (hex), si existe. */
  color: string | null
  /** Escudo del equipo; si es null se muestra solo su color. */
  crestUrl: string | null
  /** `true` cuando el participante aún depende de la clasificación. */
  pending: boolean
}

export type FixtureViewMatch = {
  id: string
  code: string
  category: CategoryCode
  phase: FixturePhase
  phaseLabel: string
  group: GroupCode | null
  court: number
  startAt: string
  endAt: string
  timeLabel: string
  home: FixtureViewSide
  away: FixtureViewSide
  homeGoals: number
  awayGoals: number
  status: FixtureStatus
  decidedBy: DecidedBy | null
  penaltyHome: number | null
  penaltyAway: number | null
  updatedAt: string
}

export type FixtureViewRow = StandingRow & {
  name: string
  color: string | null
  crestUrl: string | null
}

export type FixtureViewTable = {
  key: TableKey
  title: string
  category: CategoryCode
  rows: FixtureViewRow[]
  complete: boolean
  definitive: boolean
  /** Hay empate sin resolver y se requiere resolución manual. */
  pendingTie: boolean
}

export type FixtureView = {
  seasonId: string
  seasonName: string
  config: FixtureConfig
  matches: FixtureViewMatch[]
  tables: FixtureViewTable[]
  definitions: {
    ready: boolean
    locked: boolean
    pendingTie: { A: boolean; B: boolean }
    conflict: { codes: string[]; message: string } | null
  }
  positions: Array<{ position: number; teamId: string; name: string; tied: boolean }>
  /** Problemas del calendario (solapamientos, duración, cierre) y avisos operativos. */
  schedule: { issues: string[]; alerts: string[] }
}

function sideFor(
  teamId: string | null,
  slot: FixtureMatch['homeSlot'],
  names: Map<string, string>,
  colors: Map<string, string | null>,
  crests: Map<string, string | null>,
): FixtureViewSide {
  if (teamId) {
    return {
      teamId,
      name: names.get(teamId) ?? 'Equipo',
      color: colors.get(teamId) ?? null,
      crestUrl: crests.get(teamId) ?? null,
      pending: false,
    }
  }
  if (slot) return { teamId: null, name: `Por definir (${slotLabel(slot)})`, color: null, crestUrl: null, pending: true }
  return { teamId: null, name: 'Por definir', color: null, crestUrl: null, pending: true }
}

export function buildFixtureView(snapshot: FixtureSnapshot): FixtureView {
  const config = snapshot.config ?? DEFAULT_FIXTURE_CONFIG
  const state = recalculateFixture({ teams: snapshot.teams, matches: snapshot.matches, config })
  const names = new Map(snapshot.teams.map((team) => [team.id, team.name]))
  const colors = new Map(snapshot.teams.map((team) => [team.id, team.color]))
  const crests = new Map(snapshot.teams.map((team) => [team.id, team.crestUrl]))

  const matches: FixtureViewMatch[] = [...snapshot.matches]
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.court - b.court)
    .map((m) => ({
      id: m.id,
      code: m.code,
      category: m.category,
      phase: m.phase,
      phaseLabel:
        m.phase === 'GROUP' && m.group ? `Grupo ${m.group}` : PHASE_LABELS[m.phase],
      group: m.group,
      court: m.court,
      startAt: m.startAt.toISOString(),
      endAt: m.endAt.toISOString(),
      timeLabel: `${formatScheduleTimeLabel(m.startAt)}–${formatScheduleTimeLabel(m.endAt)}`,
      home: sideFor(m.homeTeamId, m.homeSlot, names, colors, crests),
      away: sideFor(m.awayTeamId, m.awaySlot, names, colors, crests),
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      status: m.status,
      decidedBy: m.decidedBy,
      penaltyHome: m.penaltyHome,
      penaltyAway: m.penaltyAway,
      updatedAt: m.updatedAt.toISOString(),
    }))

  const toRows = (rows: StandingRow[]): FixtureViewRow[] =>
    rows.map((row) => ({
      ...row,
      name: names.get(row.teamId) ?? 'Equipo',
      color: colors.get(row.teamId) ?? null,
      crestUrl: crests.get(row.teamId) ?? null,
    }))

  const { A, B, league } = state.standings
  const tables: FixtureViewTable[] = [
    {
      key: 'A',
      title: 'Grupo A · 2017–2016',
      category: GROUPS_CATEGORY,
      rows: toRows(A.rows),
      complete: A.complete,
      definitive: A.definitive,
      pendingTie: A.complete && !A.fullyResolved,
    },
    {
      key: 'B',
      title: 'Grupo B · 2017–2016',
      category: GROUPS_CATEGORY,
      rows: toRows(B.rows),
      complete: B.complete,
      definitive: B.definitive,
      pendingTie: B.complete && !B.fullyResolved,
    },
    {
      key: 'LEAGUE',
      title: 'Liga · 2019–2018',
      category: LEAGUE_CATEGORY,
      rows: toRows(league.rows),
      complete: league.complete,
      definitive: league.definitive,
      pendingTie: league.complete && !league.fullyResolved,
    },
  ]

  const scheduleMatches = snapshot.matches.map((m) => ({
    code: m.code,
    court: m.court,
    startAt: m.startAt,
    endAt: m.endAt,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    phase: m.phase,
  }))
  const schedule = {
    issues: validateSchedule(scheduleMatches, {
      matchMinutes: FIXTURE_MATCH_MINUTES,
      latestEnd: fixtureStartAt({ startTime: '12:00' }),
    }),
    alerts: operationalAlerts(scheduleMatches, names),
  }

  return {
    seasonId: snapshot.seasonId,
    seasonName: snapshot.seasonName,
    config,
    matches,
    tables,
    definitions: {
      ready: state.plan.ready,
      locked: state.plan.locked,
      pendingTie: state.plan.pendingTie,
      conflict: state.plan.conflict,
    },
    positions: state.positions.map((p) => ({
      ...p,
      name: names.get(p.teamId) ?? 'Equipo',
    })),
    schedule,
  }
}
