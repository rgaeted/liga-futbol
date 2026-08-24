import {
  formatScheduleDateInput,
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
  scheduleInputToIso,
} from '@/lib/schedule-datetime'
import { db } from '@/lib/db'
import { APP_TIMEZONE } from '@/lib/locale'
import { matchDisplayName } from '@/lib/match-label'
import { formatMatchWeather } from '@/lib/match-weather'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'
import { EventType, FriendlySide, MatchStatus, MatchType } from '@prisma/client'

export type AnalyticsPeriod = '7' | '30' | '90' | 'all'

export type AnalyticsWeatherPeriod = {
  avgTempC: number
  minTempC: number
  maxTempC: number
  topLabels: string[]
}

const PERIOD_DAYS: Record<Exclude<AnalyticsPeriod, 'all'>, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7': 'últimos 7 días',
  '30': 'últimos 30 días',
  '90': 'últimos 90 días',
  all: 'todo el historial',
}

export function resolveAnalyticsPeriod(
  raw: string | null | undefined,
  now = new Date(),
): { period: AnalyticsPeriod; from: Date | null; label: string } {
  const period: AnalyticsPeriod =
    raw === '7' || raw === '30' || raw === '90' || raw === 'all' ? raw : '30'
  if (period === 'all') {
    return { period, from: null, label: PERIOD_LABELS.all }
  }
  const shifted = new Date(now.getTime() - PERIOD_DAYS[period] * 86_400_000)
  const from = new Date(scheduleInputToIso(formatScheduleDateInput(shifted), '00:00'))
  return { period, from, label: PERIOD_LABELS[period] }
}

export function paidRate(paidCount: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((paidCount / total) * 100)
}

export function applyMatchCap<T>(matches: T[], cap = 200): { rows: T[]; truncated: boolean } {
  if (matches.length <= cap) return { rows: matches, truncated: false }
  return { rows: matches.slice(0, cap), truncated: true }
}

export function shouldShowBlock(rows: readonly unknown[]): boolean {
  return rows.length > 0
}

export function weatherPeriodSummary(
  snapshots: Array<{ weatherTempC: number | null; weatherLabel: string | null }>,
): AnalyticsWeatherPeriod | null {
  const usable = snapshots.filter(
    (s): s is { weatherTempC: number; weatherLabel: string } =>
      s.weatherTempC != null && Boolean(s.weatherLabel),
  )
  if (usable.length < 2) return null
  const temps = usable.map((s) => s.weatherTempC)
  const avgTempC = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
  const counts = new Map<string, number>()
  for (const s of usable) counts.set(s.weatherLabel, (counts.get(s.weatherLabel) ?? 0) + 1)
  const topLabels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 2)
    .map(([label]) => label)
  return {
    avgTempC,
    minTempC: Math.min(...temps),
    maxTempC: Math.max(...temps),
    topLabels,
  }
}

export type AnalyticsPersonStat = {
  playerId: string
  name: string
  value: number
  meta: string
}

export function rankByCount(
  counts: Map<string, { name: string; value: number; meta?: string }>,
  take = 8,
): AnalyticsPersonStat[] {
  return [...counts.entries()]
    .map(([playerId, row]) => ({
      playerId,
      name: row.name,
      value: row.value,
      meta: row.meta ?? '',
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}

function bump(
  map: Map<string, { name: string; value: number; meta?: string }>,
  playerId: string | null | undefined,
  name: string | null | undefined,
) {
  if (!playerId) return
  const current = map.get(playerId) ?? { name: name ?? 'Jugador', value: 0, meta: '' }
  current.value += 1
  if (name) current.name = name
  map.set(playerId, current)
}

export function tallyGoalEvents(
  events: Array<{
    type: string
    playerId: string | null
    assistPlayerId?: string | null
    playerName?: string | null
    assistName?: string | null
  }>,
): { scorers: AnalyticsPersonStat[]; assists: AnalyticsPersonStat[] } {
  const goals = new Map<string, { name: string; value: number; meta?: string }>()
  const assists = new Map<string, { name: string; value: number; meta?: string }>()
  for (const event of events) {
    if (event.type !== 'GOAL') continue
    bump(goals, event.playerId, event.playerName)
    bump(assists, event.assistPlayerId, event.assistName)
  }
  return { scorers: rankByCount(goals), assists: rankByCount(assists) }
}

export type AnalyticsKpi = {
  label: string
  value: string
  unit: string
  delta: string
  foot: string
}

export type AnalyticsNextMatch = {
  id: string
  label: string
  when: string
  venue: string
  sideACount: number
  sideBCount: number
  paidCount: number
  rosterCount: number
  galletaName: string | null
  hasCoach: boolean
  weatherLine: string | null
}

export type AnalyticsPendingItem = {
  tone: 'danger' | 'warn'
  title: string
  href: string
}

export type AnalyticsWeekBucket = {
  weekLabel: string
  matches: number
  goals: number
}

export type OrgAnalyticsDashboard = {
  organizationName: string
  period: AnalyticsPeriod
  periodLabel: string
  matchCount: number
  truncated: boolean
  kpis: AnalyticsKpi[]
  nextMatch: AnalyticsNextMatch | null
  pending: AnalyticsPendingItem[]
  unpaid: AnalyticsPersonStat[]
  weekly: AnalyticsWeekBucket[]
  weatherPeriod: AnalyticsWeatherPeriod | null
  rankings: {
    scorers: AnalyticsPersonStat[]
    assists: AnalyticsPersonStat[]
    appearances: AnalyticsPersonStat[]
    galleta: AnalyticsPersonStat[]
    mvp: AnalyticsPersonStat[]
    coaches: AnalyticsPersonStat[]
    cards: AnalyticsPersonStat[]
  }
  league: {
    visible: boolean
    standingsPreview: Array<{ team: string; pts: number; gf: number; gc: number }>
    scorers: AnalyticsPersonStat[]
  }
}

const MATCH_ANALYTICS_INCLUDE = {
  homeTeam: { select: { id: true, name: true } },
  awayTeam: { select: { id: true, name: true } },
  friendlyPlayers: {
    select: {
      playerId: true,
      side: true,
      paid: true,
      isGalleta: true,
      isCoach: true,
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  },
  callUps: {
    select: {
      playerId: true,
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  },
  events: {
    select: {
      type: true,
      playerId: true,
      assistPlayerId: true,
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
      assistPlayer: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  },
  teamMvps: {
    select: {
      playerId: true,
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  },
} as const

type AnalyticsMatchRow = {
  id: string
  matchType: MatchType
  status: MatchStatus
  scheduledAt: Date
  venue: string | null
  communeName: string | null
  homeScore: number
  awayScore: number
  sideAName: string | null
  sideBName: string | null
  weatherTempC: number | null
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherLabel: string | null
  homeTeam: { id: string; name: string } | null
  awayTeam: { id: string; name: string } | null
  friendlyPlayers: Array<{
    playerId: string
    side: FriendlySide
    paid: boolean
    isGalleta: boolean
    isCoach: boolean
    player: Parameters<typeof playerDisplayName>[0]
  }>
  callUps: Array<{
    playerId: string
    player: Parameters<typeof playerDisplayName>[0]
  }>
  events: Array<{
    type: EventType
    playerId: string | null
    assistPlayerId: string | null
    player: Parameters<typeof playerDisplayName>[0] | null
    assistPlayer: Parameters<typeof playerDisplayName>[0] | null
  }>
  teamMvps: Array<{
    playerId: string | null
    player: Parameters<typeof playerDisplayName>[0] | null
  }>
}

function mondayKeyForDate(date: Date): string {
  let cursor = date
  for (let i = 0; i < 7; i++) {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      weekday: 'long',
    }).format(cursor)
    if (weekday === 'Monday') return formatScheduleDateInput(cursor)
    cursor = new Date(cursor.getTime() - 86_400_000)
  }
  return formatScheduleDateInput(date)
}

function weekLabelFromMonday(mondayKey: string): string {
  const monday = new Date(scheduleInputToIso(mondayKey, '12:00'))
  const sunday = new Date(monday.getTime() + 6 * 86_400_000)
  const dayFmt = new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  })
  const monthFmt = new Intl.DateTimeFormat('es-CL', {
    month: 'short',
    timeZone: APP_TIMEZONE,
  })
  return `${dayFmt.format(monday)}–${dayFmt.format(sunday)} ${monthFmt.format(sunday)}`
}

export function buildWeeklyBuckets(
  rows: Array<{ scheduledAt: Date; goals: number; finished: boolean }>,
): AnalyticsWeekBucket[] {
  const buckets = new Map<string, { matches: number; goals: number }>()
  for (const row of rows) {
    const key = mondayKeyForDate(row.scheduledAt)
    const current = buckets.get(key) ?? { matches: 0, goals: 0 }
    current.matches += 1
    if (row.finished) current.goals += row.goals
    buckets.set(key, current)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, stats]) => ({
      weekLabel: weekLabelFromMonday(key),
      matches: stats.matches,
      goals: stats.goals,
    }))
}

function bumpPlayer(
  map: Map<string, { name: string; value: number; meta?: string }>,
  playerId: string | null | undefined,
  name: string,
  meta?: string,
) {
  if (!playerId) return
  const current = map.get(playerId) ?? { name, value: 0, meta: meta ?? '' }
  current.value += 1
  current.name = name
  if (meta) current.meta = meta
  map.set(playerId, current)
}

function buildNextMatch(next: AnalyticsMatchRow | null): AnalyticsNextMatch | null {
  if (!next) return null
  const roster = next.friendlyPlayers
  const sideACount = roster.filter((row) => row.side === FriendlySide.A).length
  const sideBCount = roster.filter((row) => row.side === FriendlySide.B).length
  const paidCount = roster.filter((row) => row.paid).length
  const galleta = roster.find((row) => row.isGalleta)
  return {
    id: next.id,
    label: matchDisplayName(next),
    when: `${formatScheduleDateLabel(next.scheduledAt)} · ${formatScheduleTimeLabel(next.scheduledAt)}`,
    venue: next.venue ?? next.communeName ?? 'Sin sede',
    sideACount,
    sideBCount,
    paidCount,
    rosterCount: roster.length,
    galletaName: galleta ? playerDisplayName(galleta.player) : null,
    hasCoach: roster.some((row) => row.isCoach),
    weatherLine: formatMatchWeather(next),
  }
}

function buildLeagueStandings(
  leagueFinished: AnalyticsMatchRow[],
): Array<{ team: string; pts: number; gf: number; gc: number }> {
  const table = new Map<string, { team: string; pts: number; gf: number; gc: number }>()
  const ensure = (team: string) => {
    if (!table.has(team)) table.set(team, { team, pts: 0, gf: 0, gc: 0 })
    return table.get(team)!
  }
  for (const match of leagueFinished) {
    const home = match.homeTeam?.name ?? 'Local'
    const away = match.awayTeam?.name ?? 'Visitante'
    const homeRow = ensure(home)
    const awayRow = ensure(away)
    homeRow.gf += match.homeScore
    homeRow.gc += match.awayScore
    awayRow.gf += match.awayScore
    awayRow.gc += match.homeScore
    if (match.homeScore > match.awayScore) homeRow.pts += 3
    else if (match.homeScore < match.awayScore) awayRow.pts += 3
    else {
      homeRow.pts += 1
      awayRow.pts += 1
    }
  }
  return [...table.values()]
    .sort((a, b) => b.pts - a.pts || b.gf - b.gc - (a.gf - a.gc))
    .slice(0, 8)
}

export async function getOrgAnalyticsDashboard(
  organizationId: string,
  periodRaw?: string | null,
): Promise<OrgAnalyticsDashboard> {
  const { period, from, label: periodLabel } = resolveAnalyticsPeriod(periodRaw)
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true },
  })

  const matchWhere = {
    organizationId,
    ...(from ? { scheduledAt: { gte: from } } : {}),
  }

  const [rawMatches, nextRaw] = await Promise.all([
    db.match.findMany({
      where: matchWhere,
      orderBy: { scheduledAt: 'desc' },
      take: 201,
      select: {
        id: true,
        matchType: true,
        status: true,
        scheduledAt: true,
        venue: true,
        communeName: true,
        homeScore: true,
        awayScore: true,
        sideAName: true,
        sideBName: true,
        weatherTempC: true,
        weatherHumidityPct: true,
        weatherWindKmh: true,
        weatherLabel: true,
        homeTeam: MATCH_ANALYTICS_INCLUDE.homeTeam,
        awayTeam: MATCH_ANALYTICS_INCLUDE.awayTeam,
        friendlyPlayers: MATCH_ANALYTICS_INCLUDE.friendlyPlayers,
        callUps: MATCH_ANALYTICS_INCLUDE.callUps,
        events: MATCH_ANALYTICS_INCLUDE.events,
        teamMvps: MATCH_ANALYTICS_INCLUDE.teamMvps,
      },
    }),
    db.match.findFirst({
      where: {
        organizationId,
        status: MatchStatus.SCHEDULED,
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        matchType: true,
        status: true,
        scheduledAt: true,
        venue: true,
        communeName: true,
        homeScore: true,
        awayScore: true,
        sideAName: true,
        sideBName: true,
        weatherTempC: true,
        weatherHumidityPct: true,
        weatherWindKmh: true,
        weatherLabel: true,
        homeTeam: MATCH_ANALYTICS_INCLUDE.homeTeam,
        awayTeam: MATCH_ANALYTICS_INCLUDE.awayTeam,
        friendlyPlayers: MATCH_ANALYTICS_INCLUDE.friendlyPlayers,
        callUps: MATCH_ANALYTICS_INCLUDE.callUps,
        events: MATCH_ANALYTICS_INCLUDE.events,
        teamMvps: MATCH_ANALYTICS_INCLUDE.teamMvps,
      },
    }),
  ])

  const { rows: matches, truncated } = applyMatchCap(rawMatches as AnalyticsMatchRow[], 200)
  const finished = matches.filter((m) => m.status === MatchStatus.FINISHED)
  const scheduledLike = matches.filter((m) =>
    [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.HALFTIME].includes(m.status),
  )

  const friendlyRows = matches.flatMap((m) => m.friendlyPlayers)
  const callUpRows = matches.flatMap((m) => m.callUps)
  const rosterCount = friendlyRows.length + callUpRows.length
  const paidCount = friendlyRows.filter((row) => row.paid).length
  const paidPct = paidRate(paidCount, friendlyRows.length)

  const uniquePlayers = new Set<string>()
  for (const row of friendlyRows) uniquePlayers.add(row.playerId)
  for (const row of callUpRows) uniquePlayers.add(row.playerId)

  const totalGoals = finished.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0)
  const goalsPerMatch =
    finished.length > 0 ? (totalGoals / finished.length).toFixed(1) : '—'

  const kpis: AnalyticsKpi[] = [
    {
      label: 'Partidos',
      value: String(finished.length),
      unit: `de ${matches.length}`,
      delta: `${scheduledLike.length} por jugar`,
      foot: periodLabel,
    },
    {
      label: 'Convocatorias',
      value: String(rosterCount),
      unit: 'filas',
      delta: `${friendlyRows.length} amistoso`,
      foot: `${callUpRows.length} liga`,
    },
    paidPct != null
      ? {
          label: 'Cobro',
          value: String(paidPct),
          unit: '% pagado',
          delta: `${friendlyRows.length - paidCount} adeudan`,
          foot: `${friendlyRows.length} convocados`,
        }
      : {
          label: 'Jugadores',
          value: String(uniquePlayers.size),
          unit: 'distintos',
          delta: 'Sin roster amistoso',
          foot: periodLabel,
        },
    {
      label: 'Goles',
      value: String(totalGoals),
      unit: 'en el período',
      delta: `${goalsPerMatch} / partido`,
      foot: `${finished.length} finalizados`,
    },
  ]

  const unpaidMap = new Map<string, { name: string; matches: Set<string> }>()
  for (const match of matches) {
    for (const row of match.friendlyPlayers) {
      if (row.paid) continue
      const current = unpaidMap.get(row.playerId) ?? {
        name: playerDisplayName(row.player),
        matches: new Set<string>(),
      }
      current.matches.add(match.id)
      unpaidMap.set(row.playerId, current)
    }
  }
  const unpaid = [...unpaidMap.entries()]
    .map(([playerId, row]) => ({
      playerId,
      name: row.name,
      value: row.matches.size,
      meta: `${row.matches.size} partido${row.matches.size === 1 ? '' : 's'}`,
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, 8)

  const pending: AnalyticsPendingItem[] = []
  const friendlyMatches = matches.filter((m) => m.matchType === MatchType.FRIENDLY)
  const noCoach = friendlyMatches.filter(
    (m) => !m.friendlyPlayers.some((row) => row.isCoach),
  ).length
  if (noCoach > 0) {
    pending.push({
      tone: 'danger',
      title: `${noCoach} amistoso${noCoach === 1 ? '' : 's'} sin DT`,
      href: '/admin/matches',
    })
  }
  const noVenue = matches.filter((m) => !m.venue && !m.communeName).length
  if (noVenue > 0) {
    pending.push({
      tone: 'warn',
      title: `${noVenue} partido${noVenue === 1 ? '' : 's'} sin sede`,
      href: '/admin/matches',
    })
  }
  const noMvp = finished.filter(
    (m) => !m.teamMvps.some((row) => row.playerId),
  ).length
  if (noMvp > 0) {
    pending.push({
      tone: 'warn',
      title: `${noMvp} partido${noMvp === 1 ? '' : 's'} sin MVP`,
      href: '/admin/matches',
    })
  }

  const eventRows = matches.flatMap((m) =>
    m.events.map((event) => ({
      type: event.type,
      playerId: event.playerId,
      assistPlayerId: event.assistPlayerId,
      playerName: event.player ? playerDisplayName(event.player) : null,
      assistName: event.assistPlayer ? playerDisplayName(event.assistPlayer) : null,
    })),
  )
  const { scorers, assists } = tallyGoalEvents(eventRows)

  const appearances = new Map<string, { name: string; value: number; meta?: string }>()
  const galleta = new Map<string, { name: string; value: number; meta?: string }>()
  const coaches = new Map<string, { name: string; value: number; meta?: string }>()
  const mvp = new Map<string, { name: string; value: number; meta?: string }>()
  const cards = new Map<string, { name: string; value: number; meta?: string }>()
  const seenAppearance = new Set<string>()

  for (const match of matches) {
    for (const row of match.friendlyPlayers) {
      const name = playerDisplayName(row.player)
      const key = `${match.id}:${row.playerId}`
      if (!seenAppearance.has(key)) {
        seenAppearance.add(key)
        bumpPlayer(appearances, row.playerId, name)
      }
      if (row.isGalleta) bumpPlayer(galleta, row.playerId, name)
      if (row.isCoach) bumpPlayer(coaches, row.playerId, name)
    }
    for (const row of match.callUps) {
      const name = playerDisplayName(row.player)
      const key = `${match.id}:${row.playerId}`
      if (!seenAppearance.has(key)) {
        seenAppearance.add(key)
        bumpPlayer(appearances, row.playerId, name)
      }
    }
    for (const row of match.teamMvps) {
      if (!row.playerId || !row.player) continue
      bumpPlayer(mvp, row.playerId, playerDisplayName(row.player))
    }
    for (const event of match.events) {
      if (
        event.type !== EventType.YELLOW_CARD &&
        event.type !== EventType.RED_CARD
      ) {
        continue
      }
      if (!event.playerId || !event.player) continue
      bumpPlayer(cards, event.playerId, playerDisplayName(event.player))
    }
  }

  const weekly = buildWeeklyBuckets(
    matches.map((m) => ({
      scheduledAt: m.scheduledAt,
      goals: m.homeScore + m.awayScore,
      finished: m.status === MatchStatus.FINISHED,
    })),
  )

  const weatherPeriod = weatherPeriodSummary(matches)

  const leagueMatches = matches.filter((m) => m.matchType === MatchType.LEAGUE)
  const leagueFinished = leagueMatches.filter((m) => m.status === MatchStatus.FINISHED)
  const leagueEventList = leagueMatches.flatMap((m) =>
    m.events.map((event) => ({
      type: event.type,
      playerId: event.playerId,
      assistPlayerId: event.assistPlayerId,
      playerName: event.player ? playerDisplayName(event.player) : null,
      assistName: event.assistPlayer ? playerDisplayName(event.assistPlayer) : null,
    })),
  )

  return {
    organizationName: organization.name,
    period,
    periodLabel,
    matchCount: matches.length,
    truncated,
    kpis,
    nextMatch: buildNextMatch(nextRaw as AnalyticsMatchRow | null),
    pending,
    unpaid,
    weekly,
    weatherPeriod,
    rankings: {
      scorers,
      assists,
      appearances: rankByCount(appearances),
      galleta: rankByCount(galleta),
      mvp: rankByCount(mvp),
      coaches: rankByCount(coaches),
      cards: rankByCount(cards),
    },
    league: {
      visible: leagueMatches.length > 0,
      standingsPreview: buildLeagueStandings(leagueFinished),
      scorers: tallyGoalEvents(leagueEventList).scorers,
    },
  }
}
