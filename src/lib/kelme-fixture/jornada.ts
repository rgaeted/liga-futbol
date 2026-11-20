import { MatchStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import { formatScheduleTimeLabel } from '@/lib/schedule-datetime'
import { footballFormatLabel } from '@/lib/football-format'
import { teamCrestUrl } from '@/lib/team-crest'
import { calculateStandings } from './standings'
import { categoryCodeFromName, getFixtureView } from './service'
import type { FixtureStatus } from './types'
import type { FixtureView, FixtureViewMatch, FixtureViewRow, FixtureViewSide } from './view'

/** Partido de una jornada todos contra todos; la categoría es el nombre libre de la temporada. */
export type JornadaMatch = Omit<FixtureViewMatch, 'category'> & { category: string }

export type JornadaTable = {
  key: 'LEAGUE'
  category: string
  title: string
  rows: FixtureViewRow[]
  definitive: boolean
  pendingTie: boolean
}

export type JornadaView = {
  seasonId: string
  seasonName: string
  /** «Fútbol 9», etc. */
  formatLabel: string
  matches: JornadaMatch[]
  tables: JornadaTable[]
}

/** Una fecha del torneo. `legacy` es el cuadro con grupos y definiciones; `league` es todos contra todos. */
export type PublicJornada =
  | { kind: 'legacy'; seasonId: string; startsAt: string; dateLabel: string; view: FixtureView }
  | { kind: 'league'; seasonId: string; startsAt: string; dateLabel: string; view: JornadaView }

const STATUS: Record<MatchStatus, FixtureStatus> = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'IN_PROGRESS',
  HALFTIME: 'IN_PROGRESS',
  FINISHED: 'FINAL',
  CANCELLED: 'CANCELLED',
}

/** «Domingo 22 de noviembre» en hora de Chile. */
export function jornadaDateLabel(date: Date): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options }).format(date)
  const weekday = part({ weekday: 'long' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${part({ day: 'numeric' })} de ${part({ month: 'long' })}`
}

export async function loadJornadaView(seasonId: string): Promise<JornadaView> {
  const [season, seasonTeams, rows] = await Promise.all([
    db.season.findUnique({ where: { id: seasonId }, select: { name: true, footballFormat: true } }),
    db.seasonTeam.findMany({
      where: { seasonId },
      orderBy: { sortOrder: 'asc' },
      include: {
        team: { select: { id: true, name: true, color: true, crestMimeType: true, updatedAt: true } },
        seasonCategory: { select: { sortOrder: true, category: { select: { name: true } } } },
      },
    }),
    db.match.findMany({
      where: { seasonId, fixtureCode: { not: null } },
      include: { seasonCategory: { select: { category: { select: { name: true } } } } },
      orderBy: [{ scheduledAt: 'asc' }, { court: 'asc' }],
    }),
  ])

  const side = new Map<string, FixtureViewSide>()
  for (const st of seasonTeams) {
    side.set(st.team.id, {
      teamId: st.team.id,
      name: (st.team.name || st.displayName || '').trim(),
      color: st.color ?? st.team.color,
      crestUrl: st.team.crestMimeType ? teamCrestUrl(st.team.id, st.team.updatedAt) : null,
      pending: false,
    })
  }
  const pending: FixtureViewSide = { teamId: null, name: 'Por definir', color: null, crestUrl: null, pending: true }
  const sideOf = (teamId: string | null) => (teamId ? (side.get(teamId) ?? pending) : pending)

  const matches: JornadaMatch[] = rows.map((row) => {
    const endAt = row.endsAt ?? new Date(row.scheduledAt.getTime() + 35 * 60_000)
    return {
      id: row.id,
      code: row.fixtureCode ?? '',
      category: row.seasonCategory?.category.name ?? '',
      phase: 'LEAGUE',
      phaseLabel: 'Liga',
      group: null,
      court: row.court ?? 0,
      startAt: row.scheduledAt.toISOString(),
      endAt: endAt.toISOString(),
      timeLabel: `${formatScheduleTimeLabel(row.scheduledAt)}–${formatScheduleTimeLabel(endAt)}`,
      home: sideOf(row.homeTeamId),
      away: sideOf(row.awayTeamId),
      homeGoals: row.homeScore,
      awayGoals: row.awayScore,
      status: STATUS[row.status],
      decidedBy: row.decidedBy,
      penaltyHome: row.penaltyHome,
      penaltyAway: row.penaltyAway,
      updatedAt: row.updatedAt.toISOString(),
    }
  })

  const categories = [
    ...new Map(
      seasonTeams
        .filter((st) => st.seasonCategory)
        .sort((a, b) => a.seasonCategory!.sortOrder - b.seasonCategory!.sortOrder)
        .map((st) => [st.seasonCategory!.category.name, st.seasonCategory!.sortOrder]),
    ).keys(),
  ]

  const tables: JornadaTable[] = categories.map((category) => {
    const teamIds = seasonTeams
      .filter((st) => st.seasonCategory?.category.name === category)
      .map((st) => st.team.id)
    const standings = calculateStandings({
      teamIds,
      matches: matches
        .filter((m) => m.category === category)
        .map((m) => ({
          homeTeamId: m.home.teamId,
          awayTeamId: m.away.teamId,
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
          status: m.status,
        })),
    })
    return {
      key: 'LEAGUE',
      category,
      title: `Categoría ${category.replace('-', '–')}`,
      rows: standings.rows.map((row) => {
        const s = side.get(row.teamId)
        return { ...row, name: s?.name ?? 'Equipo', color: s?.color ?? null, crestUrl: s?.crestUrl ?? null }
      }),
      definitive: standings.definitive,
      pendingTie: standings.complete && !standings.fullyResolved,
    }
  })

  return {
    seasonId,
    seasonName: season?.name ?? '',
    formatLabel: season ? footballFormatLabel(season.footballFormat) : '',
    matches,
    tables,
  }
}

/**
 * Fechas del torneo para la landing pública, de la más reciente a la más antigua. La primera es la
 * «próxima fecha» que se muestra por defecto; las demás quedan accesibles como historial.
 * Tolerante a fallos: ante cualquier error devuelve una lista vacía.
 */
export async function getPublicJornadas(organizationSlug: string): Promise<PublicJornada[]> {
  try {
    const org = await db.organization.findFirst({
      where: { slug: organizationSlug, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!org) return []

    const seasons = await db.season.findMany({
      where: { organizationId: org.id, matches: { some: { fixtureCode: { not: null } } } },
      select: {
        id: true,
        seasonCategories: { select: { category: { select: { name: true } } } },
        matches: {
          where: { fixtureCode: { not: null } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: { scheduledAt: true },
        },
      },
    })

    const dated = seasons
      .filter((s) => s.matches[0])
      .map((s) => ({
        id: s.id,
        startsAt: s.matches[0]!.scheduledAt,
        legacy: s.seasonCategories.length > 0 && s.seasonCategories.every((c) => categoryCodeFromName(c.category.name)),
      }))
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())

    const jornadas = await Promise.all(
      dated.map(async (s): Promise<PublicJornada> => {
        const base = { seasonId: s.id, startsAt: s.startsAt.toISOString(), dateLabel: jornadaDateLabel(s.startsAt) }
        return s.legacy
          ? { kind: 'legacy', ...base, view: await getFixtureView(s.id) }
          : { kind: 'league', ...base, view: await loadJornadaView(s.id) }
      }),
    )
    return jornadas
  } catch (error) {
    console.warn('[kelme-fixture] no se pudieron cargar las fechas del torneo', error)
    return []
  }
}
