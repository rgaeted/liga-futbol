import Link from 'next/link'
import type { RefereePanelViewer } from '@/lib/referee-panel-links'
import {
  RefereeMatchesHistorySection,
  type RefereeMatchRow,
} from '@/components/referee/RefereeMatchCards'
import { RefereeAdminViewBanner } from '@/components/referee/RefereeAdminViewBanner'

type Props = {
  organizationSlug: string
  viewer: RefereePanelViewer
  refereeName: string
  matches: RefereeMatchRow[]
  panelHref: string
  matchesHref: string
  adminBackHref?: string
}

export function RefereeMatchesView({
  organizationSlug,
  viewer,
  refereeName,
  matches,
  panelHref,
  matchesHref,
  adminBackHref,
}: Props) {
  const league = matches.filter((m) => m.matchType === 'LEAGUE')
  const friendly = matches.filter((m) => m.matchType === 'FRIENDLY')
  const hasAny = matches.length > 0

  const title = viewer === 'admin' ? `Partidos de ${refereeName}` : 'Mis partidos'
  const subtitle =
    viewer === 'admin'
      ? 'Historial de partidos arbitrados por este árbitro en la liga.'
      : 'Historial de partidos que has arbitrado en esta liga.'

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {viewer === 'admin' && adminBackHref ? (
        <RefereeAdminViewBanner
          refereeName={refereeName}
          backHref={adminBackHref}
          matchesHref={matchesHref}
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-anton)] text-2xl uppercase tracking-[0.06em] text-[#E8E4D8]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[#8A938C]">{subtitle}</p>
        </div>
        <Link
          href={panelHref}
          className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3DE68C] hover:underline"
        >
          ← {viewer === 'admin' ? 'Panel' : 'Mi panel'}
        </Link>
      </div>

      {!hasAny ? (
        <p className="text-[#8A938C]">
          {viewer === 'admin'
            ? 'Este árbitro no tiene partidos asignados en esta liga.'
            : 'No tienes partidos asignados en esta liga.'}
        </p>
      ) : (
        <>
          <RefereeMatchesHistorySection
            title="Liga"
            matches={league}
            organizationSlug={organizationSlug}
            viewer={viewer}
          />
          <RefereeMatchesHistorySection
            title="Amistosos"
            matches={friendly}
            organizationSlug={organizationSlug}
            viewer={viewer}
          />
        </>
      )}
    </div>
  )
}
