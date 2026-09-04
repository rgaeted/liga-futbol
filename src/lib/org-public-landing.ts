import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'
import {
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
} from '@/lib/schedule-datetime'
import { tallyPlayerAwardRankings } from '@/lib/player-awards'

export type TeamTone = 'white' | 'black'

export type LandingFormMark = 'W' | 'D' | 'L'

export type OrgPublicLanding = {
  organization: {
    name: string
    slug: string
    primaryColor: string
    logoUrl: string | null
    monogram: string
    headline: { first: string; rest: string | null }
  }
  featured: {
    id: string
    status: 'LIVE' | 'HALFTIME' | 'FINISHED'
    dateLine: string
    venue: string
    home: { name: string; tone: TeamTone }
    away: { name: string; tone: TeamTone }
    homeScore: number
    awayScore: number
    scoreCaption: string
    mvp: { name: string; initials: string } | null
  } | null
  live: Array<{
    id: string
    label: string
    score: string
    status: 'LIVE' | 'HALFTIME'
  }>
  nextMatch: {
    id: string
    label: string
    when: string
    venue: string
    dateLine: string
    time: string
    home: string
    away: string
    sidesReady: boolean
  } | null
  results: Array<{
    id: string
    dateLine: string
    home: string
    away: string
    homeScore: number
    awayScore: number
  }>
  form: {
    teamName: string
    wins: number
    marks: LandingFormMark[]
  } | null
  scorers: Array<{
    name: string
    goals: number
  }>
  assists: Array<{
    name: string
    assists: number
  }>
  awards: Array<{
    name: string
    shortLabel: string
    emoji: string
    description: string | null
    accentColor: string | null
    recipientCount: number
    recipients: Array<{ name: string }>
  }>
  awardLeaders: Array<{
    name: string
    awards: number
  }>
}

const matchPublicSelect = {
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
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
} as const

type MatchPublicRow = {
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
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
}

const PLACEHOLDER_SIDES = new Set(['Lado A', 'Lado B', 'Local', 'Visitante'])

const MONTH_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  const weekday = get('weekday')
  return {
    weekday: weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : '',
    day: get('day'),
    month: MONTH_SHORT[Number(get('month')) - 1] ?? '',
    year: get('year'),
  }
}

export function formatLandingHeroDate(date: Date): string {
  const { weekday, day, month, year } = dateParts(date)
  return `${weekday.toUpperCase()} · ${day} ${month} ${year}`
}

export function formatLandingCardDate(date: Date): string {
  const { day, month } = dateParts(date)
  return `${day} ${month} · ${formatScheduleTimeLabel(date)}`
}

export function formatLandingNextDate(date: Date): string {
  const { weekday, day, month } = dateParts(date)
  return `${weekday} ${day} ${month}`
}

export function orgMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function splitOrgHeadline(name: string): { first: string; rest: string | null } {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return { first: name.trim(), rest: null }
  return { first: words[0] ?? name, rest: words.slice(1).join(' ') }
}

export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function teamToneFromName(name: string, side: 'home' | 'away'): TeamTone {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/(blanco|white)/.test(normalized)) return 'white'
  if (/(negro|black)/.test(normalized)) return 'black'
  return side === 'home' ? 'white' : 'black'
}

export function sidesAreReady(home: string, away: string): boolean {
  return !PLACEHOLDER_SIDES.has(home) && !PLACEHOLDER_SIDES.has(away)
}

export function formLastFive(
  matches: Array<{ home: string; away: string; homeScore: number; awayScore: number }>,
  teamName: string,
): { teamName: string; wins: number; marks: LandingFormMark[] } | null {
  const marks: LandingFormMark[] = []
  for (const match of matches) {
    const isHome = match.home === teamName
    const isAway = match.away === teamName
    if (!isHome && !isAway) continue
    const teamScore = isHome ? match.homeScore : match.awayScore
    const otherScore = isHome ? match.awayScore : match.homeScore
    if (teamScore > otherScore) marks.push('W')
    else if (teamScore === otherScore) marks.push('D')
    else marks.push('L')
    if (marks.length === 5) break
  }
  if (marks.length === 0) return null
  return {
    teamName,
    wins: marks.filter((mark) => mark === 'W').length,
    marks,
  }
}

function matchWhenLabel(scheduledAt: Date): string {
  return `${formatScheduleDateLabel(scheduledAt)} · ${formatScheduleTimeLabel(scheduledAt)}`
}

function matchScoreLabel(match: Pick<MatchPublicRow, 'homeScore' | 'awayScore'>): string {
  return `${match.homeScore} – ${match.awayScore}`
}

function matchVenueLabel(match: Pick<MatchPublicRow, 'venue' | 'communeName'>): string {
  return match.venue ?? match.communeName ?? 'Sin sede'
}

function toLiveMatch(match: MatchPublicRow): OrgPublicLanding['live'][number] {
  return {
    id: match.id,
    label: matchDisplayName(match),
    score: matchScoreLabel(match),
    status: match.status === MatchStatus.HALFTIME ? 'HALFTIME' : 'LIVE',
  }
}

function toNextMatch(match: MatchPublicRow): OrgPublicLanding['nextMatch'] {
  const sides = matchSideNames(match)
  return {
    id: match.id,
    label: matchDisplayName(match),
    when: matchWhenLabel(match.scheduledAt),
    venue: matchVenueLabel(match),
    dateLine: formatLandingNextDate(match.scheduledAt),
    time: formatScheduleTimeLabel(match.scheduledAt),
    home: sides.home,
    away: sides.away,
    sidesReady: sidesAreReady(sides.home, sides.away),
  }
}

function toResultMatch(match: MatchPublicRow): OrgPublicLanding['results'][number] {
  const sides = matchSideNames(match)
  return {
    id: match.id,
    dateLine: formatLandingCardDate(match.scheduledAt),
    home: sides.home,
    away: sides.away,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  }
}

function toFeatured(
  match: MatchPublicRow & {
    teamMvps?: Array<{ player: Parameters<typeof playerDisplayName>[0] | null }>
  },
): OrgPublicLanding['featured'] {
  const sides = matchSideNames(match)
  const mvpName = match.teamMvps
    ?.map((row) => (row.player ? playerDisplayName(row.player) : null))
    .find((name): name is string => Boolean(name))
  const live = match.status === MatchStatus.LIVE || match.status === MatchStatus.HALFTIME
  return {
    id: match.id,
    status: match.status === MatchStatus.HALFTIME ? 'HALFTIME' : live ? 'LIVE' : 'FINISHED',
    dateLine: formatLandingHeroDate(match.scheduledAt),
    venue: matchVenueLabel(match),
    home: { name: sides.home, tone: teamToneFromName(sides.home, 'home') },
    away: { name: sides.away, tone: teamToneFromName(sides.away, 'away') },
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    scoreCaption: live
      ? match.status === MatchStatus.HALFTIME
        ? 'Entretiempo'
        : 'En juego'
      : 'Resultado final',
    mvp: mvpName ? { name: mvpName, initials: personInitials(mvpName) } : null,
  }
}

export async function getOrgPublicLanding(slug: string): Promise<OrgPublicLanding | null> {
  const org = await db.organization.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoStoragePath: true,
    },
  })
  if (!org) return null

  const now = new Date()
  const scorersFrom = new Date(now.getTime() - 30 * 86_400_000)
  const featuredInclude = {
    ...matchPublicSelect,
    teamMvps: {
      where: { playerId: { not: null } },
      take: 2,
      include: {
        player: { include: PLAYER_PERSON_NAME_INCLUDE },
      },
    },
  } as const

  const [liveMatches, nextMatch, results, scorerMatches, orgAwards, recentAwardGrants] =
    await Promise.all([
    db.match.findMany({
      where: {
        organizationId: org.id,
        OR: [{ status: MatchStatus.LIVE }, { status: MatchStatus.HALFTIME }],
      },
      orderBy: { scheduledAt: 'asc' },
      select: featuredInclude,
    }),
    db.match.findFirst({
      where: {
        organizationId: org.id,
        status: MatchStatus.SCHEDULED,
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      select: matchPublicSelect,
    }),
    db.match.findMany({
      where: { organizationId: org.id, status: MatchStatus.FINISHED },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      select: featuredInclude,
    }),
    db.match.findMany({
      where: {
        organizationId: org.id,
        status: MatchStatus.FINISHED,
        scheduledAt: { gte: scorersFrom },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 40,
      select: {
        events: {
          where: { type: EventType.GOAL },
          select: {
            type: true,
            playerId: true,
            player: { include: PLAYER_PERSON_NAME_INCLUDE },
            assistPlayerId: true,
            assistPlayer: { include: PLAYER_PERSON_NAME_INCLUDE },
          },
        },
      },
    }),
    db.orgAward.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { playerAwards: true } },
        playerAwards: {
          orderBy: { awardedAt: 'desc' },
          take: 6,
          include: {
            player: { include: PLAYER_PERSON_NAME_INCLUDE },
          },
        },
      },
    }),
    db.playerAward.findMany({
      where: {
        organizationId: org.id,
        awardedAt: { gte: scorersFrom },
        orgAward: { isActive: true },
      },
      include: {
        player: { include: PLAYER_PERSON_NAME_INCLUDE },
        orgAward: { select: { emoji: true, shortLabel: true, isActive: true } },
      },
    }),
  ])

  const goalEvents = scorerMatches.flatMap((match) =>
    match.events.map((event) => ({
      type: event.type,
      playerId: event.playerId,
      playerName: event.player ? playerDisplayName(event.player) : null,
      assistPlayerId: event.assistPlayerId,
      assistName: event.assistPlayer ? playerDisplayName(event.assistPlayer) : null,
    })),
  )

  const resultCards = results.map(toResultMatch)
  const featuredSource = liveMatches[0] ?? results[0] ?? null

  return {
    organization: {
      name: org.name,
      slug: org.slug,
      primaryColor: org.primaryColor,
      logoUrl: editorialPublicUrl(org.logoStoragePath),
      monogram: orgMonogram(org.name),
      headline: splitOrgHeadline(org.name),
    },
    featured: featuredSource ? toFeatured(featuredSource) : null,
    live: liveMatches.map(toLiveMatch),
    nextMatch: nextMatch ? toNextMatch(nextMatch) : null,
    results: resultCards,
    form: resultCards[0]
      ? formLastFive(resultCards, resultCards[0].home)
      : null,
    scorers: tallyRecentScorers(goalEvents),
    assists: tallyRecentAssists(goalEvents),
    awards: orgAwards.map((award) => ({
      name: award.name,
      shortLabel: award.shortLabel,
      emoji: award.emoji,
      description: award.description,
      accentColor: award.accentColor,
      recipientCount: award._count.playerAwards,
      recipients: award.playerAwards.map((grant) => ({
        name: playerDisplayName(grant.player),
      })),
    })),
    awardLeaders: tallyPlayerAwardRankings(
      recentAwardGrants.map((grant) => ({
        playerId: grant.playerId,
        playerName: playerDisplayName(grant.player),
        awardEmoji: grant.orgAward.emoji,
        awardShortLabel: grant.orgAward.shortLabel,
      })),
      5,
    ).map((row) => ({ name: row.name, awards: row.value })),
  }
}

export function tallyRecentScorers(
  events: Array<{ type: string; playerId: string | null; playerName: string | null }>,
  take = 5,
): Array<{ name: string; goals: number }> {
  const map = new Map<string, { name: string; goals: number }>()
  for (const e of events) {
    if (e.type !== 'GOAL' || !e.playerId) continue
    const row = map.get(e.playerId) ?? { name: e.playerName ?? 'Jugador', goals: 0 }
    row.goals += 1
    if (e.playerName) row.name = e.playerName
    map.set(e.playerId, row)
  }
  return [...map.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}

export function tallyRecentAssists(
  events: Array<{
    type: string
    assistPlayerId: string | null
    assistName: string | null
  }>,
  take = 5,
): Array<{ name: string; assists: number }> {
  const map = new Map<string, { name: string; assists: number }>()
  for (const e of events) {
    if (e.type !== 'GOAL' || !e.assistPlayerId) continue
    const row = map.get(e.assistPlayerId) ?? { name: e.assistName ?? 'Jugador', assists: 0 }
    row.assists += 1
    if (e.assistName) row.name = e.assistName
    map.set(e.assistPlayerId, row)
  }
  return [...map.values()]
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}
