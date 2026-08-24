import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { matchDisplayName } from '@/lib/match-label'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'
import {
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
} from '@/lib/schedule-datetime'

export type OrgPublicLanding = {
  organization: {
    name: string
    slug: string
    primaryColor: string
    logoUrl: string | null
  }
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
  } | null
  results: Array<{
    id: string
    label: string
    score: string
    when: string
  }>
  scorers: Array<{
    name: string
    goals: number
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
  return {
    id: match.id,
    label: matchDisplayName(match),
    when: matchWhenLabel(match.scheduledAt),
    venue: matchVenueLabel(match),
  }
}

function toResultMatch(match: MatchPublicRow): OrgPublicLanding['results'][number] {
  return {
    id: match.id,
    label: matchDisplayName(match),
    score: matchScoreLabel(match),
    when: matchWhenLabel(match.scheduledAt),
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

  const [liveMatches, nextMatch, results, scorerMatches] = await Promise.all([
    db.match.findMany({
      where: {
        organizationId: org.id,
        OR: [{ status: MatchStatus.LIVE }, { status: MatchStatus.HALFTIME }],
      },
      orderBy: { scheduledAt: 'asc' },
      select: matchPublicSelect,
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
      select: matchPublicSelect,
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
          },
        },
      },
    }),
  ])

  const scorerEvents = scorerMatches.flatMap((match) =>
    match.events.map((event) => ({
      type: event.type,
      playerId: event.playerId,
      playerName: event.player ? playerDisplayName(event.player) : null,
    })),
  )

  return {
    organization: {
      name: org.name,
      slug: org.slug,
      primaryColor: org.primaryColor,
      logoUrl: editorialPublicUrl(org.logoStoragePath),
    },
    live: liveMatches.map(toLiveMatch),
    nextMatch: nextMatch ? toNextMatch(nextMatch) : null,
    results: results.map(toResultMatch),
    scorers: tallyRecentScorers(scorerEvents),
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
