import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { matchDisplayName } from '@/lib/match-label'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'
import {
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
} from '@/lib/schedule-datetime'
import { tallyPlayerAwardRankings } from '@/lib/player-awards'

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

  const [liveMatches, nextMatch, results, scorerMatches, orgAwards, recentAwardGrants] =
    await Promise.all([
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
