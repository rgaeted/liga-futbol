import Link from 'next/link'
import type { RefereeOrgStats } from '@/lib/referee-org-stats'
import type { RefereePanelViewer } from '@/lib/referee-panel-links'
import { RefereePanelHero } from '@/components/referee/RefereePanelHero'
import { RefereeResultsCard } from '@/components/referee/RefereeResultsCard'
import {
  RefereeFinishedMatchList,
  RefereeUpcomingMatchList,
  type RefereeMatchRow,
} from '@/components/referee/RefereeMatchCards'
import { RefereeAdminViewBanner } from '@/components/referee/RefereeAdminViewBanner'
import { PlayerPanelSection } from '@/components/player/PlayerPanelSection'

type Props = {
  organizationSlug: string
  viewer: RefereePanelViewer
  refereeName: string
  photoUrl: string | null
  stats: RefereeOrgStats
  upcoming: RefereeMatchRow[]
  finished: RefereeMatchRow[]
  allMatchCount: number
  nextMatch: {
    id: string
    title: string
    scheduledAt: Date
    status: string
    href: string
  } | null
  matchesHref: string
  adminBackHref?: string
}

export function RefereePanelView({
  organizationSlug,
  viewer,
  refereeName,
  photoUrl,
  stats,
  upcoming,
  finished,
  allMatchCount,
  nextMatch,
  matchesHref,
  adminBackHref,
}: Props) {
  const emptyText =
    viewer === 'admin'
      ? 'Este árbitro no tiene partidos asignados en esta liga.'
      : 'No tienes partidos asignados en esta liga.'

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      {viewer === 'admin' && adminBackHref ? (
        <RefereeAdminViewBanner
          refereeName={refereeName}
          backHref={adminBackHref}
          matchesHref={matchesHref}
        />
      ) : null}

      <RefereePanelHero
        name={refereeName}
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
            viewer={viewer}
            emptyText={
              viewer === 'admin'
                ? 'Sin partidos programados ni en curso para este árbitro.'
                : undefined
            }
          />
        </PlayerPanelSection>

        <PlayerPanelSection
          title="Recientes"
          compact
          action={
            finished.length > 0 ? (
              <Link
                href={matchesHref}
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
            emptyText={
              viewer === 'admin'
                ? 'Aún no hay partidos finalizados para este árbitro.'
                : undefined
            }
          />
        </PlayerPanelSection>
      </div>

      {allMatchCount === 0 ? (
        <p className="text-center text-sm text-[#8A938C]">{emptyText}</p>
      ) : null}

      {viewer === 'self' ? (
        <p className="text-center">
          <Link
            href={matchesHref}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C] hover:text-[#3DE68C]"
          >
            Ver historial completo →
          </Link>
        </p>
      ) : null}
    </div>
  )
}
