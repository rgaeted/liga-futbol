import { MatchStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { matchDisplayName } from '@/lib/match-label'
import { orgPath } from '@/lib/tenant-paths'
import { getRefereeOrgStats } from '@/lib/referee-org-stats'
import type { RefereeMatchRow } from '@/components/referee/RefereeMatchCards'
import {
  refereeMatchLinkHref,
  type RefereePanelViewer,
} from '@/lib/referee-panel-links'

export const REFEREE_MATCH_SELECT = {
  id: true,
  matchType: true,
  status: true,
  scheduledAt: true,
  homeScore: true,
  awayScore: true,
  venue: true,
  footballFormat: true,
  sideAName: true,
  sideBName: true,
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
} as const

const ACTIVE_STATUSES: MatchStatus[] = [
  MatchStatus.LIVE,
  MatchStatus.HALFTIME,
  MatchStatus.SCHEDULED,
]

function upcomingSortPriority(status: MatchStatus): number {
  if (status === MatchStatus.LIVE) return 0
  if (status === MatchStatus.HALFTIME) return 1
  return 2
}

export async function loadRefereeDashboardData(userId: string, organizationId: string) {
  const [user, matches, stats] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        refereeProfile: { select: { photoStoragePath: true } },
      },
    }),
    db.match.findMany({
      where: { refereeId: userId, organizationId },
      select: REFEREE_MATCH_SELECT,
      orderBy: { scheduledAt: 'asc' },
    }),
    getRefereeOrgStats(userId, organizationId),
  ])

  const rows = matches as RefereeMatchRow[]

  const upcoming = rows
    .filter((match) => ACTIVE_STATUSES.includes(match.status))
    .sort((a, b) => {
      const priority = upcomingSortPriority(a.status) - upcomingSortPriority(b.status)
      if (priority !== 0) return priority
      return a.scheduledAt.getTime() - b.scheduledAt.getTime()
    })

  const finished = rows
    .filter((match) => match.status === MatchStatus.FINISHED)
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())

  return {
    user,
    rows,
    upcoming,
    finished,
    stats,
    photoUrl: editorialPublicUrl(user?.refereeProfile?.photoStoragePath ?? null),
  }
}

export function buildRefereeNextMatch(
  organizationSlug: string,
  viewer: RefereePanelViewer,
  featured: RefereeMatchRow | undefined,
) {
  if (!featured) return null
  return {
    id: featured.id,
    title: matchDisplayName(featured),
    scheduledAt: featured.scheduledAt,
    status: featured.status,
    href: refereeMatchLinkHref(organizationSlug, featured.id, featured.status, viewer),
  }
}

export async function loadRefereeMatchesHistory(userId: string, organizationId: string) {
  const matches = await db.match.findMany({
    where: { refereeId: userId, organizationId },
    select: REFEREE_MATCH_SELECT,
    orderBy: { scheduledAt: 'desc' },
  })

  return matches as RefereeMatchRow[]
}
