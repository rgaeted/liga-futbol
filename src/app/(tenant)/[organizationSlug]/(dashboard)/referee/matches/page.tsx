import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import {
  RefereeMatchesHistorySection,
  type RefereeMatchRow,
} from '@/components/referee/RefereeMatchCards'

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

export default async function RefereeMatchesPage({
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

  const matches = await db.match.findMany({
    where: { refereeId: session.user.id, organizationId },
    select: MATCH_SELECT,
    orderBy: { scheduledAt: 'desc' },
  })

  const rows = matches as RefereeMatchRow[]
  const league = rows.filter((m) => m.matchType === 'LEAGUE')
  const friendly = rows.filter((m) => m.matchType === 'FRIENDLY')
  const hasAny = rows.length > 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-anton)] text-2xl uppercase tracking-[0.06em] text-[#E8E4D8]">
            Mis partidos
          </h1>
          <p className="mt-1 text-sm text-[#8A938C]">
            Historial de partidos que has arbitrado en esta liga.
          </p>
        </div>
        <Link
          href={orgPath(organizationSlug, '/referee')}
          className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3DE68C] hover:underline"
        >
          ← Mi panel
        </Link>
      </div>

      {!hasAny ? (
        <p className="text-[#8A938C]">No tienes partidos asignados en esta liga.</p>
      ) : (
        <>
          <RefereeMatchesHistorySection
            title="Liga"
            matches={league}
            organizationSlug={organizationSlug}
          />
          <RefereeMatchesHistorySection
            title="Amistosos"
            matches={friendly}
            organizationSlug={organizationSlug}
          />
        </>
      )}
    </div>
  )
}
