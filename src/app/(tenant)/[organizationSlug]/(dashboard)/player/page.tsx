import Link from 'next/link'
import { MatchStatus, type FootballFormat, type FriendlySide, type MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { listFriendlyParticipationsForPlayerInOrg } from '@/lib/friendly-match-player-list'
import { friendlyLineupLinkLabel } from '@/lib/match-player-links'
import { LOSLUNES_SLUG } from '@/lib/org-brand'
import { orgPath } from '@/lib/tenant-paths'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'
import { PlayerAwardBadges } from '@/components/player/PlayerAwardBadges'
import { PlayerResultsCard } from '@/components/player/PlayerResultsCard'
import { requirePlayerDashboardContext } from '@/lib/player-dashboard-access'
import {
  findScheduledFriendlyAttendanceWhere,
  friendlyMatchPublicPath,
  MATCH_ATTENDANCE_BOARD_SELECT,
  toMatchAttendanceBoard,
} from '@/lib/match-attendance'
import {
  groupPlayerAwardsBySeason,
  serializePlayerAwardBadge,
} from '@/lib/player-awards'
import { computePlayerMatchResults } from '@/lib/player-match-results'
import { getPlayerOrgEventStats } from '@/lib/player-org-stats'
import { db } from '@/lib/db'

export default async function PlayerDashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const context = await requirePlayerDashboardContext(organizationSlug)
  if (!context) {
    return (
      <p className="text-kelme-gray-900">
        No tienes ficha de jugador en esta liga. Si jugaste partidos aquí, pide al administrador que
        enlace tu cuenta con tu ficha.
      </p>
    )
  }

  const { session, organizationId, player, playerWithTeam } = context

  const [callUps, friendlyParticipations, mvpCount, playerAwards, scheduledFriendlies, organization, eventStats] =
    await Promise.all([
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
      db.matchTeamMvp.count({
        where: { playerId: player.id, match: { status: MatchStatus.FINISHED } },
      }),
      db.playerAward.findMany({
        where: { playerId: player.id, organizationId },
        include: {
          orgAward: true,
          season: { select: { id: true, name: true } },
        },
        orderBy: { awardedAt: 'desc' },
      }),
      db.match.findMany({
        where: findScheduledFriendlyAttendanceWhere(organizationId, new Date()),
        orderBy: { scheduledAt: 'asc' },
        select: MATCH_ATTENDANCE_BOARD_SELECT,
      }),
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { badgesEnabled: true },
      }),
      getPlayerOrgEventStats(player.id),
    ])

  const upcomingLeague = callUps.filter(
    (c) => c.match.status === 'SCHEDULED' || c.match.status === 'LIVE',
  )
  const playedLeague = callUps.filter((c) => c.match.status === 'FINISHED')
  const upcomingFriendly = friendlyParticipations.filter(
    (p) => p.match.status === 'SCHEDULED' || p.match.status === 'LIVE',
  )
  const playedFriendly = friendlyParticipations.filter((p) => p.match.status === 'FINISHED')

  const badgeItems = playerAwards.map((row) => ({
    seasonId: row.seasonId,
    seasonName: row.season?.name ?? null,
    badge: serializePlayerAwardBadge(row),
  }))
  const grouped = groupPlayerAwardsBySeason(badgeItems)
  const matchResults = computePlayerMatchResults({
    leagueCallUps: callUps,
    friendlyParticipations,
    playerTeamId: playerWithTeam.teamId,
  })

  return (
    <div className="space-y-6 text-kelme-gray-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Mi panel</h1>
          <p className="text-kelme-gray-400">
            {playerWithTeam.person.firstName} · {playerWithTeam.team?.name ?? 'Sin equipo'}
          </p>
        </div>
        <Link
          href={orgPath(organizationSlug, '/player/profile')}
          className="text-sm font-semibold text-kelme-red hover:underline"
        >
          Mi perfil →
        </Link>
      </header>

      <PlayerResultsCard stats={eventStats} results={matchResults} mvpCount={mvpCount} />

      {(organizationSlug === LOSLUNES_SLUG || organization.badgesEnabled) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {organizationSlug === LOSLUNES_SLUG ? (
            <Link
              href={orgPath(organizationSlug, `/jugador/${player.id}?from=player`)}
              className="text-kelme-red hover:underline"
            >
              Ver mi carta
            </Link>
          ) : null}
          {organization.badgesEnabled ? (
            <Link
              href={orgPath(organizationSlug, `/jugador/${player.id}?from=player`)}
              className="text-kelme-red hover:underline"
            >
              Ver mis insignias
            </Link>
          ) : null}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mis premios</h2>
        <PlayerAwardBadges
          general={grouped.general.map((g) => g.badge)}
          bySeason={grouped.bySeason.map((s) => ({
            seasonName: s.seasonName,
            awards: s.awards.map((a) => a.badge),
          }))}
        />
      </section>

      {scheduledFriendlies.length > 0 ? (
        <div className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">¿Quién va?</h2>
          {scheduledFriendlies.map((match) => {
            const board = toMatchAttendanceBoard(match)
            return (
              <Link
                key={board.matchId}
                href={friendlyMatchPublicPath(organizationSlug, board.matchId)}
                className="block rounded-xl border border-kelme-border bg-kelme-surface px-4 py-3"
              >
                <p className="text-xs text-kelme-gray-500">{board.dateLine}</p>
                <p className="font-semibold">{board.matchLabel}</p>
              </Link>
            )
          })}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos partidos</h2>
        <LeagueMatchList
          items={upcomingLeague}
          playerId={player.id}
          organizationSlug={organizationSlug}
          emptyText="No hay partidos de liga programados."
        />
        <FriendlyMatchList
          items={upcomingFriendly}
          organizationSlug={organizationSlug}
          emptyText={
            upcomingLeague.length === 0 ? 'No hay partidos amistosos programados.' : undefined
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Partidos jugados</h2>
        <LeagueMatchList
          items={playedLeague.slice(0, 5)}
          playerId={player.id}
          organizationSlug={organizationSlug}
          emptyText="Aún no has jugado partidos de liga."
        />
        <FriendlyMatchList
          items={playedFriendly.slice(0, 5)}
          organizationSlug={organizationSlug}
          emptyText={
            playedLeague.length === 0 && playedFriendly.length === 0
              ? 'Aún no has jugado partidos.'
              : undefined
          }
        />
      </section>

      <Link href={orgPath(organizationSlug, '/player/matches')} className="text-kelme-red hover:underline">
        Ver todos mis partidos →
      </Link>
    </div>
  )
}

function LeagueMatchList({
  items,
  playerId,
  organizationSlug,
  emptyText,
}: {
  items: Array<{
    match: {
      id: string
      scheduledAt: Date
      homeTeam: { name: string } | null
      awayTeam: { name: string } | null
      matchType: 'LEAGUE' | 'FRIENDLY'
      sideAName: string | null
      sideBName: string | null
      homeScore: number
      awayScore: number
      status: MatchStatus
      teamMvps: Array<{ id: string; playerId: string | null }>
    }
  }>
  playerId: string
  organizationSlug: string
  emptyText?: string
}) {
  if (items.length === 0) {
    return emptyText ? <p className="text-kelme-gray-400">{emptyText}</p> : null
  }
  return (
    <ul className="space-y-2">
      {items.map(({ match }) => (
        <li key={match.id} className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
          <div className="flex justify-between gap-2">
            <span>
              {matchDisplayName(match)}
              {match.teamMvps.some((mvp) => mvp.playerId === playerId) && (
                <span className="ml-2 text-xs font-semibold text-amber-600">⭐ MVP</span>
              )}
            </span>
            <span className="font-mono">
              {match.status === 'FINISHED'
                ? `${match.homeScore} - ${match.awayScore}`
                : new Date(match.scheduledAt).toLocaleDateString('es-CL')}
            </span>
          </div>
          <div className="mt-1">
            <MatchLiveLink organizationSlug={organizationSlug} matchId={match.id} status={match.status} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function FriendlyMatchList({
  items,
  organizationSlug,
  emptyText,
}: {
  items: Array<{
    id: string
    side: FriendlySide
    isCaptain: boolean
    isCoach: boolean
    match: {
      id: string
      matchType: MatchType
      sideAName: string | null
      sideBName: string | null
      scheduledAt: Date
      status: MatchStatus
      homeScore: number
      awayScore: number
      footballFormat: FootballFormat
      venue: string | null
    }
  }>
  organizationSlug: string
  emptyText?: string
}) {
  if (items.length === 0) {
    return emptyText ? <p className="mt-2 text-kelme-gray-400">{emptyText}</p> : null
  }

  return (
    <ul className="mt-2 space-y-2">
      {items.map((part) => {
        const sides = matchSideNames({
          ...part.match,
          homeTeam: null,
          awayTeam: null,
        })
        const teamLabel = part.side === 'A' ? sides.home : sides.away
        return (
          <li key={part.id} className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
            <div className="flex justify-between gap-2">
              <span>
                {sides.home} vs {sides.away}
                {part.isCaptain && (
                  <span className="ml-2 text-xs font-semibold text-kelme-gray-500">Capitán</span>
                )}
              </span>
              <span className="font-mono">
                {part.match.status === 'FINISHED'
                  ? `${part.match.homeScore} - ${part.match.awayScore}`
                  : new Date(part.match.scheduledAt).toLocaleDateString('es-CL')}
              </span>
            </div>
            <p className="text-sm text-kelme-gray-400">
              {teamLabel} · {footballFormatLabel(part.match.footballFormat)}
              {part.match.venue ? ` · ${part.match.venue}` : ''}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <MatchLiveLink
                organizationSlug={organizationSlug}
                matchId={part.match.id}
                status={part.match.status}
              />
              {part.isCoach && (
                <Link
                  href={orgPath(organizationSlug, `/player/friendly-matches/${part.match.id}/lineup`)}
                  className="font-ui text-xs text-kelme-red hover:underline"
                >
                  {friendlyLineupLinkLabel(part.match.status)} →
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
