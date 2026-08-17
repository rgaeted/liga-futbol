import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MatchStatus } from '@prisma/client'
import { matchDisplayName } from '@/lib/match-label'
import { matchStatusBadgeClass, matchStatusLabel } from '@/lib/match-status-ui'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

const ACTIVE_STATUSES: MatchStatus[] = [
  MatchStatus.LIVE,
  MatchStatus.HALFTIME,
  MatchStatus.SCHEDULED,
]

const FINISHED_STATUSES: MatchStatus[] = [MatchStatus.FINISHED, MatchStatus.CANCELLED]

function upcomingSortPriority(status: MatchStatus): number {
  if (status === MatchStatus.LIVE) return 0
  if (status === MatchStatus.HALFTIME) return 1
  return 2
}

function MatchRow({
  href,
  title,
  scheduledAt,
  status,
  featured = false,
}: {
  href: string
  title: string
  scheduledAt: Date
  status: string
  featured?: boolean
}) {
  const dateLabel = formatScheduleDateLabel(scheduledAt)
  const timeLabel = formatScheduleTimeLabel(scheduledAt)

  return (
    <Link
      href={href}
      className={`block rounded-xl border bg-white transition-colors hover:border-[#c91f26] ${
        featured
          ? 'border-[#c91f26]/40 p-5 shadow-[0_8px_24px_#c91f2614]'
          : 'border-[#e5e5e9] p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {featured ? (
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#c91f26]">
              Próximo partido
            </p>
          ) : null}
          <p className={`truncate font-semibold text-[#17171a] ${featured ? 'text-lg' : ''}`}>
            {title}
          </p>
          <p className="mt-1 text-sm text-[#8d8d96]">
            {dateLabel} · {timeLabel}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${matchStatusBadgeClass(status)}`}
        >
          {matchStatusLabel(status)}
        </span>
      </div>
      {featured ? (
        <p className="mt-3 text-sm font-bold text-[#c91f26]">Gestionar partido →</p>
      ) : null}
    </Link>
  )
}

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

  const matches = await db.match.findMany({
    where: { refereeId: session.user.id, organizationId },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  const upcoming = matches
    .filter((match) => ACTIVE_STATUSES.includes(match.status))
    .sort((a, b) => {
      const priority = upcomingSortPriority(a.status) - upcomingSortPriority(b.status)
      if (priority !== 0) return priority
      return a.scheduledAt.getTime() - b.scheduledAt.getTime()
    })

  const finished = matches
    .filter((match) => FINISHED_STATUSES.includes(match.status))
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())

  const [featured, ...otherUpcoming] = upcoming

  return (
    <div className="space-y-8 text-[#17171a]">
      <div>
        <h1 className="font-display text-2xl font-bold">Mis partidos</h1>
        <p className="mt-1 text-sm text-[#8d8d96]">
          El partido activo o programado más próximo aparece primero.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-[#8d8d96]">No tienes partidos asignados en esta liga.</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#8d8d96]">
              Por jugar
            </h2>
            {featured ? (
              <MatchRow
                featured
                href={orgPath(organizationSlug, `/referee/match/${featured.id}`)}
                title={matchDisplayName(featured)}
                scheduledAt={featured.scheduledAt}
                status={featured.status}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-[#e5e5e9] bg-white p-4 text-sm text-[#8d8d96]">
                No tienes partidos programados ni en curso.
              </p>
            )}
            {otherUpcoming.map((match) => (
              <MatchRow
                key={match.id}
                href={orgPath(organizationSlug, `/referee/match/${match.id}`)}
                title={matchDisplayName(match)}
                scheduledAt={match.scheduledAt}
                status={match.status}
              />
            ))}
          </section>

          {finished.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#8d8d96]">
                Finalizados ({finished.length})
              </h2>
              <div className="space-y-2 rounded-xl border border-[#ececef] bg-[#fafafa] p-3">
                {finished.map((match) => (
                  <Link
                    key={match.id}
                    href={orgPath(organizationSlug, `/referee/match/${match.id}`)}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white"
                  >
                    <span className="min-w-0 truncate font-medium text-[#505058]">
                      {matchDisplayName(match)}
                    </span>
                    <span className="shrink-0 text-xs text-[#8d8d96]">
                      {formatScheduleDateLabel(match.scheduledAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
