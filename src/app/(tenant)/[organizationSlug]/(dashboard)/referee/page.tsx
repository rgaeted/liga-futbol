import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MatchStatus } from '@prisma/client'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { matchDisplayName } from '@/lib/match-label'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { getRefereeOrgStats } from '@/lib/referee-org-stats'
import { RefereePanelHero } from '@/components/referee/RefereePanelHero'
import { RefereeResultsCard } from '@/components/referee/RefereeResultsCard'
import {
  RefereeFinishedMatchList,
  RefereeUpcomingMatchList,
  type RefereeMatchRow,
} from '@/components/referee/RefereeMatchCards'
import { PlayerPanelSection } from '@/components/player/PlayerPanelSection'

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

const MATCH_SELECT = {
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

export default async function RefereeDashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const [user, matches, stats] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        refereeProfile: { select: { photoStoragePath: true } },
      },
    }),
    db.match.findMany({
      where: { refereeId: session.user.id, organizationId },
      select: MATCH_SELECT,
      orderBy: { scheduledAt: 'asc' },
    }),
    getRefereeOrgStats(session.user.id, organizationId),
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

  const featuredUpcoming = upcoming[0]
  const nextMatch = featuredUpcoming
    ? {
        id: featuredUpcoming.id,
        title: matchDisplayName(featuredUpcoming),
        scheduledAt: featuredUpcoming.scheduledAt,
        status: featuredUpcoming.status,
        href: orgPath(organizationSlug, `/referee/match/${featuredUpcoming.id}`),
      }
    : null

  const photoUrl = editorialPublicUrl(user?.refereeProfile?.photoStoragePath ?? null)

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <RefereePanelHero
        name={user?.name ?? session.user.name ?? 'Árbitro'}
        photoUrl={photoUrl}
        finishedCount={stats.matches.finished}
        totalEvents={stats.events.total}
        nextMatch={nextMatch}
      />

      <RefereeResultsCard stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlayerPanelSection title="Por arbitrar" compact>
          <RefereeUpcomingMatchList
            matches={upcoming}
            organizationSlug={organizationSlug}
          />
        </PlayerPanelSection>

        <PlayerPanelSection
          title="Recientes"
          compact
          action={
            finished.length > 0 ? (
              <Link
                href={orgPath(organizationSlug, '/referee/matches')}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3DE68C] hover:underline"
              >
                Ver todos →
              </Link>
            ) : null
          }
        >
          <RefereeFinishedMatchList
            matches={finished.slice(0, 5)}
            organizationSlug={organizationSlug}
          />
        </PlayerPanelSection>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-[#8A938C]">
          No tienes partidos asignados en esta liga.
        </p>
      ) : null}
    </div>
  )
}
