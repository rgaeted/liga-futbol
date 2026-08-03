import { db } from '@/lib/db'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import { matchDisplayName } from '@/lib/match-label'
import { resolveTeamColor } from '@/lib/team-color'
import { teamInitials, personInitials } from '@/lib/player-name'
import { MatchStatus, MatchType } from '@prisma/client'

export type AdminDashboardMatchRow = {
  id: string
  day: string
  time: string
  home: string
  away: string
  homeAbbr: string
  awayAbbr: string
  homeColor: string
  awayColor: string
  score: string
  state: string
  stateBg: string
  stateFg: string
  venue: string
}

export type AdminDashboardStandingRow = {
  rank: number
  teamId: string
  team: string
  color: string
  pj: number
  dg: string
  pts: number
  rankColor: string
}

export type AdminDashboardScorerRow = {
  abbr: string
  name: string
  team: string
  goals: number
}

export type AdminDashboardKpi = {
  label: string
  value: string
  unit: string
  delta: string
  pct: string
  foot: string
}

export type AdminDashboardTile = {
  tag: string
  title: string
  meta: string
  href: string
}

export type AdminDashboardTodo = {
  dot: string
  title: string
  meta: string
}

export type AdminDashboardData = {
  seasonId: string | null
  seasonTitle: string
  seasonSubtitle: string
  seasons: Array<{ id: string; name: string; isActive: boolean }>
  kpis: AdminDashboardKpi[]
  upcoming: AdminDashboardMatchRow[]
  results: AdminDashboardMatchRow[]
  standings: AdminDashboardStandingRow[]
  scorers: AdminDashboardScorerRow[]
  tiles: AdminDashboardTile[]
  todos: AdminDashboardTodo[]
}

function formatMatchDay(date: Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(date)
}

function formatMatchTime(date: Date, status: MatchStatus): string {
  if (status === MatchStatus.FINISHED || status === MatchStatus.CANCELLED) {
    return status === MatchStatus.FINISHED ? 'Final' : 'Cancelado'
  }
  return new Intl.DateTimeFormat(APP_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(date)
}

function matchStateBadge(match: {
  status: MatchStatus
  refereeId: string | null
  venue: string | null
  communeName: string | null
}): { state: string; stateBg: string; stateFg: string } {
  if (match.status === MatchStatus.LIVE) {
    return { state: 'En vivo', stateBg: '#fef2f2', stateFg: '#b91c1c' }
  }
  if (match.status === MatchStatus.HALFTIME) {
    return { state: 'Entretiempo', stateBg: '#fef3c7', stateFg: '#92400e' }
  }
  if (match.status === MatchStatus.FINISHED) {
    return { state: 'Confirmado', stateBg: '#ecfdf5', stateFg: '#047857' }
  }
  if (match.status === MatchStatus.CANCELLED) {
    return { state: 'Cancelado', stateBg: '#f4f4f5', stateFg: '#52525b' }
  }
  if (!match.refereeId) {
    return { state: 'Falta árbitro', stateBg: '#fef3c7', stateFg: '#92400e' }
  }
  if (!match.venue && !match.communeName) {
    return { state: 'Sede por confirmar', stateBg: '#fef3c7', stateFg: '#92400e' }
  }
  return { state: 'Programado', stateBg: '#f4f4f5', stateFg: '#52525b' }
}

function toMatchRow(match: {
  id: string
  status: MatchStatus
  scheduledAt: Date
  homeScore: number
  awayScore: number
  venue: string | null
  communeName: string | null
  refereeId: string | null
  matchType: MatchType
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string; color: string | null } | null
  awayTeam: { name: string; color: string | null } | null
}): AdminDashboardMatchRow {
  const label = matchDisplayName(match)
  const [home, away] = label.includes(' vs ') ? label.split(' vs ') : [label, '']
  const homeName = match.homeTeam?.name ?? match.sideAName ?? home
  const awayName = match.awayTeam?.name ?? match.sideBName ?? away
  const badge = matchStateBadge(match)
  const finished = match.status === MatchStatus.FINISHED

  return {
    id: match.id,
    day: formatMatchDay(match.scheduledAt),
    time: formatMatchTime(match.scheduledAt, match.status),
    home: homeName,
    away: awayName,
    homeAbbr: teamInitials(homeName),
    awayAbbr: teamInitials(awayName),
    homeColor: resolveTeamColor(match.homeTeam?.color, homeName),
    awayColor: resolveTeamColor(match.awayTeam?.color, awayName),
    score: finished ? `${match.homeScore} – ${match.awayScore}` : 'VS',
    venue: match.venue ?? match.communeName ?? 'Sin sede',
    ...badge,
  }
}

type StandingAccumulator = {
  teamId: string
  team: string
  color: string
  played: number
  gf: number
  ga: number
  points: number
}

function buildStandings(
  matches: Array<{
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    homeTeam: { id: string; name: string; color: string | null } | null
    awayTeam: { id: string; name: string; color: string | null } | null
  }>
): AdminDashboardStandingRow[] {
  const table = new Map<string, StandingAccumulator>()

  function ensureTeam(team: { id: string; name: string; color: string | null }) {
    if (!table.has(team.id)) {
      table.set(team.id, {
        teamId: team.id,
        team: team.name,
        color: resolveTeamColor(team.color, team.name),
        played: 0,
        gf: 0,
        ga: 0,
        points: 0,
      })
    }
    return table.get(team.id)!
  }

  for (const match of matches) {
    if (!match.homeTeam || !match.awayTeam) continue
    const home = ensureTeam(match.homeTeam)
    const away = ensureTeam(match.awayTeam)
    home.played += 1
    away.played += 1
    home.gf += match.homeScore
    home.ga += match.awayScore
    away.gf += match.awayScore
    away.ga += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += 3
    } else if (match.homeScore < match.awayScore) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  return [...table.values()]
    .sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || a.team.localeCompare(b.team, APP_LOCALE))
    .slice(0, 6)
    .map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      team: row.team,
      color: row.color,
      pj: row.played,
      dg: row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : String(row.gf - row.ga),
      pts: row.points,
      rankColor: index < 3 ? '#b91c1c' : '#71717a',
    }))
}

export async function getAdminDashboardData(seasonId?: string | null): Promise<AdminDashboardData> {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  const selectedSeason =
    (seasonId ? seasons.find((s) => s.id === seasonId) : null) ??
    seasons.find((s) => s.isActive) ??
    seasons[0] ??
    null

  const [
    teamCount,
    playerCount,
    friendlyPlayerCount,
    friendlyCategoryCount,
    userCount,
    topScorers,
    friendlyWithoutPhoto,
  ] = await Promise.all([
    db.team.count(),
    db.player.count(),
    db.friendlyPlayer.count(),
    db.friendlyCategory.count({ where: { isActive: true } }),
    db.user.count(),
    db.player.findMany({
      where: { goals: { gt: 0 } },
      orderBy: [{ goals: 'desc' }, { updatedAt: 'desc' }],
      take: 4,
      include: {
        user: { select: { name: true } },
        team: { select: { name: true } },
      },
    }),
    db.friendlyPlayer.count({ where: { photoMimeType: null } }),
  ])

  const seasonMatches = selectedSeason
    ? await db.match.findMany({
        where: { seasonId: selectedSeason.id, matchType: MatchType.LEAGUE },
        include: {
          homeTeam: { select: { id: true, name: true, color: true } },
          awayTeam: { select: { id: true, name: true, color: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      })
    : []

  const finished = seasonMatches.filter((m) => m.status === MatchStatus.FINISHED)
  const upcoming = seasonMatches.filter(
    (m) => m.status === MatchStatus.SCHEDULED || m.status === MatchStatus.LIVE || m.status === MatchStatus.HALFTIME
  )
  const results = [...finished].reverse()

  const totalGoals = finished.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0)
  const redCards = selectedSeason
    ? await db.matchEvent.count({
        where: {
          type: 'RED_CARD',
          match: { seasonId: selectedSeason.id, matchType: MatchType.LEAGUE },
        },
      })
    : 0

  const scheduledUpcoming = upcoming.filter((m) => m.status === MatchStatus.SCHEDULED)
  const withoutReferee = scheduledUpcoming.filter((m) => !m.refereeId).length
  const withoutVenue = scheduledUpcoming.filter((m) => !m.venue && !m.communeName).length
  const nextMatch = scheduledUpcoming[0]

  const subtitleParts: string[] = []
  if (selectedSeason) {
    subtitleParts.push(`${finished.length} jugados · ${scheduledUpcoming.length} por jugar`)
    if (nextMatch) {
      subtitleParts.push(
        `próximo ${new Intl.DateTimeFormat(APP_LOCALE, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: APP_TIMEZONE,
        }).format(nextMatch.scheduledAt)}`
      )
    }
  } else {
    subtitleParts.push('Selecciona o crea una temporada para ver el calendario de liga.')
  }

  const matchTotal = seasonMatches.length || 1
  const playedPct = Math.round((finished.length / matchTotal) * 100)

  const kpis: AdminDashboardKpi[] = [
    {
      label: 'Equipos',
      value: String(teamCount),
      unit: 'activos',
      delta: selectedSeason ? 'Liga' : '—',
      pct: teamCount > 0 ? '100%' : '0%',
      foot: selectedSeason?.name ?? 'Sin temporada',
    },
    {
      label: 'Jugadores',
      value: String(playerCount),
      unit: 'inscritos',
      delta: `+${friendlyPlayerCount} amist.`,
      pct: playerCount > 0 ? '100%' : '0%',
      foot: `${friendlyPlayerCount} en pool amistoso`,
    },
    {
      label: 'Partidos',
      value: String(finished.length),
      unit: `de ${seasonMatches.length}`,
      delta: `${playedPct}%`,
      pct: `${playedPct}%`,
      foot: `${scheduledUpcoming.length} por jugar`,
    },
    {
      label: 'Goles',
      value: String(totalGoals),
      unit: 'en la liga',
      delta: finished.length ? `${(totalGoals / finished.length).toFixed(1)} / partido` : '—',
      pct: finished.length ? `${Math.min(100, playedPct)}%` : '0%',
      foot: `${redCards} tarjetas rojas`,
    },
  ]

  const tiles: AdminDashboardTile[] = [
    {
      tag: 'EQ',
      title: 'Equipos',
      meta: `${teamCount} equipos registrados`,
      href: '/admin/teams',
    },
    {
      tag: 'JU',
      title: 'Jugadores',
      meta: `${playerCount} fichas de liga`,
      href: '/admin/players',
    },
    {
      tag: 'PA',
      title: 'Partidos',
      meta: 'Calendario y cronología',
      href: '/admin/matches',
    },
    {
      tag: 'TE',
      title: 'Temporadas',
      meta: `${seasons.filter((s) => s.isActive).length} activas · ${seasons.length} total`,
      href: '/admin/seasons',
    },
    {
      tag: 'AM',
      title: 'Amistosos',
      meta: `${friendlyCategoryCount} categorías · ${friendlyPlayerCount} jugadores`,
      href: '/admin/friendly-players',
    },
    {
      tag: 'US',
      title: 'Usuarios',
      meta: `${userCount} cuentas`,
      href: '/admin/users',
    },
  ]

  const todos: AdminDashboardTodo[] = []
  if (withoutReferee > 0) {
    todos.push({
      dot: '#b91c1c',
      title: `${withoutReferee} partido${withoutReferee === 1 ? '' : 's'} sin árbitro`,
      meta: 'Revisa el calendario próximo',
    })
  }
  if (withoutVenue > 0) {
    todos.push({
      dot: '#f59e0b',
      title: `${withoutVenue} partido${withoutVenue === 1 ? '' : 's'} sin sede confirmada`,
      meta: 'Agrega cancha o comuna',
    })
  }
  if (friendlyWithoutPhoto > 0) {
    todos.push({
      dot: '#f59e0b',
      title: `${friendlyWithoutPhoto} jugador${friendlyWithoutPhoto === 1 ? '' : 'es'} amistoso${friendlyWithoutPhoto === 1 ? '' : 's'} sin foto`,
      meta: 'Completa el perfil en amistosos',
    })
  }
  if (todos.length === 0) {
    todos.push({
      dot: '#71717a',
      title: 'Sin pendientes urgentes',
      meta: 'Todo al día en el panel',
    })
  }

  return {
    seasonId: selectedSeason?.id ?? null,
    seasonTitle: selectedSeason?.name ?? 'Panel de administración',
    seasonSubtitle: subtitleParts.join(' · '),
    seasons: seasons.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive })),
    kpis,
    upcoming: upcoming.map(toMatchRow).slice(0, 8),
    results: results.map(toMatchRow).slice(0, 8),
    standings: buildStandings(finished),
    scorers: topScorers.map((p) => ({
      abbr: personInitials(p.user.name),
      name: p.user.name,
      team: p.team?.name ?? 'Sin equipo',
      goals: p.goals,
    })),
    tiles,
    todos,
  }
}
