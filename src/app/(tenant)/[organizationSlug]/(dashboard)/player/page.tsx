import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchStatus, type FootballFormat, type FriendlySide, type MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { listFriendlyParticipationsForPlayerInOrg } from '@/lib/friendly-match-player-list'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { friendlyLineupLinkLabel } from '@/lib/match-player-links'
import { requireOrganizationId } from '@/lib/tenant-access'
import { orgPath } from '@/lib/tenant-paths'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'
import { PlayerAwardBadges } from '@/components/player/PlayerAwardBadges'
import {
  groupPlayerAwardsBySeason,
  serializePlayerAwardBadge,
} from '@/lib/player-awards'

export default async function PlayerDashboardPage({
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
  if (!player) {
    return (
      <p className="text-kelme-gray-900">
        No tienes ficha de jugador en esta liga. Si jugaste partidos aquí, pide al administrador que
        enlace tu cuenta con tu ficha.
      </p>
    )
  }

  const [callUps, friendlyParticipations, mvpCount, playerAwards] = await Promise.all([
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
  ])

  const playerWithTeam = await db.player.findUniqueOrThrow({
    where: { id: player.id },
    include: { team: true },
  })

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

  return (
    <div className="space-y-6 text-kelme-gray-900">
      <header>
        <h1 className="font-display text-2xl font-bold">{session.user.name}</h1>
        <p className="text-kelme-gray-400">
          {playerWithTeam.team?.name ?? 'Sin equipo'} · #{playerWithTeam.jerseyNumber ?? '—'} ·{' '}
          {playerWithTeam.position ?? '—'}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Goles" value={playerWithTeam.goals} />
        <StatCard label="Asistencias" value={playerWithTeam.assists} />
        <StatCard label="MVPs" value={mvpCount} />
        <StatCard label="Amarillas" value={playerWithTeam.yellowCards} />
        <StatCard label="Rojas" value={playerWithTeam.redCards} />
      </section>

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-center">
      <p className="font-display text-2xl font-bold text-kelme-red">{value}</p>
      <p className="text-sm text-kelme-gray-400">{label}</p>
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
