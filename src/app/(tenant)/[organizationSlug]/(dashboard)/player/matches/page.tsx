import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { matchStatusLabel } from '@/lib/match-status-ui'
import { footballFormatLabel } from '@/lib/football-format'
import { APP_LOCALE } from '@/lib/locale'
import { listFriendlyParticipationsForPlayerInOrg } from '@/lib/friendly-match-player-list'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { friendlyLineupLinkLabel } from '@/lib/match-player-links'
import { requireOrganizationId } from '@/lib/tenant-access'
import { orgPath } from '@/lib/tenant-paths'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'

export default async function PlayerMatchesPage({
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

  const player = await findPlayerInOrganization(session.user.id, organizationId)
  if (!player) redirect(orgPath(organizationSlug, '/player'))

  const [callUps, friendlyParticipations] = await Promise.all([
    db.callUp.findMany({
      where: { playerId: player.id, match: { matchType: 'LEAGUE' } },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            teamMvps: { select: { id: true, playerId: true } },
          },
        },
      },
      orderBy: { match: { scheduledAt: 'desc' } },
    }),
    listFriendlyParticipationsForPlayerInOrg(session.user.id, organizationId),
  ])

  const hasAny = callUps.length > 0 || friendlyParticipations.length > 0

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Mis Partidos</h1>

      {!hasAny ? (
        <p className="text-kelme-gray-400">Aún no has participado en ningún partido en esta liga.</p>
      ) : (
        <>
          {callUps.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Liga</h2>
              {callUps.map(({ match, isStarter }) => (
                <div
                  key={match.id}
                  className="rounded-xl border border-kelme-border bg-kelme-surface p-4"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {matchDisplayName(match)}
                        {match.teamMvps.some((mvp) => mvp.playerId === player.id) && (
                          <span className="ml-2 text-xs font-semibold text-amber-600">⭐ MVP</span>
                        )}
                      </p>
                      <p className="text-sm text-kelme-gray-400">
                        {new Date(match.scheduledAt).toLocaleString(APP_LOCALE)} ·{' '}
                        {isStarter ? 'Titular' : 'Suplente'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">
                        {match.homeScore} - {match.awayScore}
                      </p>
                      <p className="text-xs text-kelme-gray-400">{matchStatusLabel(match.status)}</p>
                      <div className="mt-1 flex flex-col items-end gap-1">
                        <MatchLiveLink
                          organizationSlug={organizationSlug}
                          matchId={match.id}
                          status={match.status}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {friendlyParticipations.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Amistosos</h2>
              {friendlyParticipations.map((part) => {
                const match = part.match
                const sides = matchSideNames({
                  ...match,
                  homeTeam: null,
                  awayTeam: null,
                })
                const teamLabel = part.side === 'A' ? sides.home : sides.away
                return (
                  <div
                    key={part.id}
                    className="rounded-xl border border-kelme-border bg-kelme-surface p-4"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {sides.home} vs {sides.away}
                          {part.isCaptain && (
                            <span className="ml-2 text-xs font-semibold text-kelme-gray-500">
                              Capitán
                            </span>
                          )}
                          {part.isCoach && (
                            <span className="ml-2 text-xs font-semibold text-kelme-gray-500">
                              DT
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-kelme-gray-400">
                          {teamLabel} · {footballFormatLabel(match.footballFormat)} ·{' '}
                          {new Date(match.scheduledAt).toLocaleString(APP_LOCALE)}
                          {match.venue ? ` · ${match.venue}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">
                          {match.homeScore} - {match.awayScore}
                        </p>
                        <p className="text-xs text-kelme-gray-400">{matchStatusLabel(match.status)}</p>
                        <div className="mt-1 flex flex-col items-end gap-1">
                          <MatchLiveLink
                            organizationSlug={organizationSlug}
                            matchId={match.id}
                            status={match.status}
                          />
                          {part.isCoach && (
                            <Link
                              href={orgPath(
                                organizationSlug,
                                `/player/friendly-matches/${match.id}/lineup`,
                              )}
                              className="text-xs text-kelme-red hover:underline"
                            >
                              {friendlyLineupLinkLabel(match.status)}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          )}
        </>
      )}
    </div>
  )
}
