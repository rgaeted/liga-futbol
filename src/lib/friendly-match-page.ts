import { MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import {
  canOpenMatchAttendance,
  MATCH_ATTENDANCE_INCLUDE,
  serializeMatchAttendance,
} from '@/lib/match-attendance'
import { matchSideNames } from '@/lib/match-label'
import { sidesAreReady } from '@/lib/org-public-landing'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'

export function canShowFriendlyMatchLiveLink(status: string): boolean {
  return (
    status === MatchStatus.LIVE ||
    status === MatchStatus.HALFTIME ||
    status === MatchStatus.FINISHED
  )
}

export async function getFriendlyMatchPage(slug: string, matchId: string) {
  const org = await db.organization.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true, slug: true },
  })
  if (!org) return null

  const match = await db.match.findFirst({
    where: {
      id: matchId,
      organizationId: org.id,
      matchType: MatchType.FRIENDLY,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      venue: true,
      communeName: true,
      matchType: true,
      sideAName: true,
      sideBName: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      attendances: {
        orderBy: { createdAt: 'asc' },
        include: MATCH_ATTENDANCE_INCLUDE,
      },
    },
  })
  if (!match) return null

  const sides = matchSideNames(match)
  return {
    matchId: match.id,
    organizationSlug: org.slug,
    status: match.status,
    dateLine: formatScheduleDateLabel(match.scheduledAt),
    time: formatScheduleTimeLabel(match.scheduledAt),
    venue: match.venue ?? match.communeName ?? 'Sin sede',
    home: sides.home,
    away: sides.away,
    sidesReady: sidesAreReady(sides.home, sides.away),
    open: canOpenMatchAttendance(match),
    attendees: serializeMatchAttendance(match.attendances),
  }
}
