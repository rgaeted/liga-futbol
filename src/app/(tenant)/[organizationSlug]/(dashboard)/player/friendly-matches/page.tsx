import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listFriendlyCoachMatchesForUser } from '@/lib/friendly-match-coach'
import { matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { APP_LOCALE } from '@/lib/locale'
import { requireOrganizationId } from '@/lib/tenant-access'
import { orgPath } from '@/lib/tenant-paths'
import { friendlyLineupLinkLabel } from '@/lib/match-player-links'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'

export const dynamic = 'force-dynamic'

export default async function PlayerFriendlyCoachMatchesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    redirect('/login')
  }

  const coachMatches = await listFriendlyCoachMatchesForUser(session.user.id, organizationId)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Amistosos como DT</h1>
        <p className="mt-1 text-sm text-kelme-gray-600">
          Partidos amistosos donde fuiste designado director técnico. Solo puedes editar la
          formación de tu equipo.
        </p>
      </header>

      {coachMatches.length === 0 ? (
        <div className="rounded-xl border border-kelme-border bg-kelme-surface p-6 text-center">
          <p className="font-ui font-semibold text-kelme-gray-900">
            No tienes partidos amistosos como DT
          </p>
          <p className="mt-2 text-sm text-kelme-gray-600">
            El administrador te designará cuando arme el roster del partido.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {coachMatches.map((part) => {
            const match = part.match
            if (!match) return null

            const sides = matchSideNames({
              ...match,
              homeTeam: null,
              awayTeam: null,
            })
            const teamLabel = part.side === 'A' ? sides.home : sides.away
            const lineupLabel = friendlyLineupLinkLabel(match.status)
            return (
              <li key={part.id} className="card-kelme p-4">
                <p className="font-ui font-semibold text-kelme-gray-900">
                  {sides.home} vs {sides.away}
                </p>
                <p className="mt-1 text-sm text-kelme-gray-600">
                  Tu equipo: {teamLabel} · {footballFormatLabel(match.footballFormat)} ·{' '}
                  {new Date(match.scheduledAt).toLocaleString(APP_LOCALE)}
                  {match.venue ? ` · ${match.venue}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <Link
                    href={orgPath(organizationSlug, `/player/friendly-matches/${match.id}/lineup`)}
                    className="text-kelme-red hover:underline"
                  >
                    {lineupLabel} →
                  </Link>
                  <MatchLiveLink
                    organizationSlug={organizationSlug}
                    matchId={match.id}
                    status={match.status}
                    className="text-kelme-gray-600 hover:underline"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
