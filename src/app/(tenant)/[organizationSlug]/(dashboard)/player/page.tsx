import Link from 'next/link'
import { EventType, MatchStatus } from '@prisma/client'
import { listFriendlyParticipationsForPlayerInOrg } from '@/lib/friendly-match-player-list'
import { personHasPhoto, friendlyPlayerPhotoUrl } from '@/lib/friendly-player-photo'
import { LOSLUNES_SLUG } from '@/lib/org-brand'
import { orgPath } from '@/lib/tenant-paths'
import { matchSideNames } from '@/lib/match-label'
import { PlayerAwardBadges } from '@/components/player/PlayerAwardBadges'
import {
  FriendlyMatchList,
  LeagueMatchList,
  UpcomingMatchesPanel,
} from '@/components/player/PlayerMatchCards'
import { PlayerPanelCardSection } from '@/components/player/PlayerPanelCardSection'
import { PlayerPanelHero } from '@/components/player/PlayerPanelHero'
import { PlayerPanelSection } from '@/components/player/PlayerPanelSection'
import { PlayerResultsCard } from '@/components/player/PlayerResultsCard'
import { requirePlayerDashboardContext } from '@/lib/player-dashboard-access'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
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
import { computePlayerFormStreak, countPlayedMatches } from '@/lib/player-form-streak'
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
      <p className="text-[#E8E4D8]">
        No tienes ficha de jugador en esta liga. Si jugaste partidos aquí, pide al administrador que
        enlace tu cuenta con tu ficha.
      </p>
    )
  }

  const { session, organizationId, player, playerWithTeam } = context

  const [callUps, friendlyParticipations, mvpCount, playerAwards, scheduledFriendlies, organization, eventStats, cardResult, lastAssistEvent] =
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
      organizationSlug === LOSLUNES_SLUG ? getLosLunesPlayerCard(player.id) : Promise.resolve(null),
      db.matchEvent.findFirst({
        where: { assistPlayerId: player.id, type: EventType.GOAL },
        orderBy: { createdAt: 'desc' },
        include: {
          match: {
            select: {
              sideAName: true,
              sideBName: true,
              matchType: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          },
        },
      }),
    ])

  const card = cardResult?.kind === 'ok' ? cardResult.card : null
  const showCardLink = organizationSlug === LOSLUNES_SLUG
  const showBadgesLink = organization.badgesEnabled

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
  const playedCount = countPlayedMatches(matchResults)
  const recentCount = Math.min(5, playedLeague.length + playedFriendly.length)
  const form = computePlayerFormStreak({
    leagueCallUps: callUps,
    friendlyParticipations,
    playerTeamId: playerWithTeam.teamId,
  })

  const photoUrl = personHasPhoto(playerWithTeam.person)
    ? friendlyPlayerPhotoUrl(player.id)
    : null

  const lastAssistSides = lastAssistEvent?.match
    ? matchSideNames({
        ...lastAssistEvent.match,
        homeTeam: lastAssistEvent.match.homeTeam,
        awayTeam: lastAssistEvent.match.awayTeam,
      })
    : null
  const lastAssistLabel = lastAssistSides
    ? `Última: ${lastAssistSides.home} vs ${lastAssistSides.away}`
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <PlayerPanelHero
        organizationSlug={organizationSlug}
        playerId={player.id}
        firstName={playerWithTeam.person.firstName}
        lastName={playerWithTeam.person.lastName}
        teamName={playerWithTeam.team?.name ?? null}
        position={playerWithTeam.position}
        photoUrl={photoUrl}
        playedCount={playedCount}
        results={matchResults}
        form={form}
        card={card}
        showCardLink={showCardLink}
        showBadgesLink={showBadgesLink}
        cardEmbedded={Boolean(card)}
      />

      {card ? (
        <PlayerPanelCardSection
          card={card}
          organizationSlug={organizationSlug}
          playerId={player.id}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PlayerResultsCard
          stats={eventStats}
          results={matchResults}
          mvpCount={mvpCount}
          lastAssistLabel={lastAssistLabel}
          playedCount={playedCount}
          card={card}
        />

        <div className="flex flex-col gap-4">
          <PlayerPanelSection title="Mis premios" compact>
            <PlayerAwardBadges
              general={grouped.general.map((g) => g.badge)}
              bySeason={grouped.bySeason.map((s) => ({
                seasonName: s.seasonName,
                awards: s.awards.map((a) => a.badge),
              }))}
            />
          </PlayerPanelSection>

          {scheduledFriendlies.length > 0 ? (
            <PlayerPanelSection title="¿Quién va?" compact>
              <div className="space-y-2">
                {scheduledFriendlies.map((match) => {
                  const board = toMatchAttendanceBoard(match)
                  return (
                    <Link
                      key={board.matchId}
                      href={friendlyMatchPublicPath(organizationSlug, board.matchId)}
                      className="block rounded-xl border border-[#2A3A32] bg-[#0B1210] px-3 py-2.5 transition hover:border-[#C91F26]/40"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">
                        {board.dateLine}
                      </p>
                      <p className="text-sm font-semibold text-[#E8E4D8]">{board.matchLabel}</p>
                    </Link>
                  )
                })}
              </div>
            </PlayerPanelSection>
          ) : null}

          <PlayerPanelSection title="Próximos partidos" compact>
            <UpcomingMatchesPanel
              hasLeague={upcomingLeague.length > 0}
              hasFriendly={upcomingFriendly.length > 0}
            />
            <LeagueMatchList
              items={upcomingLeague}
              playerId={player.id}
              organizationSlug={organizationSlug}
              emptyText={
                upcomingFriendly.length === 0 ? 'No hay partidos de liga programados.' : undefined
              }
            />
            <FriendlyMatchList
              items={upcomingFriendly}
              organizationSlug={organizationSlug}
              emptyText={
                upcomingLeague.length === 0 ? 'No hay partidos amistosos programados.' : undefined
              }
            />
          </PlayerPanelSection>
        </div>
      </div>

      <PlayerPanelSection
        title="Partidos jugados"
        action={
          recentCount > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">
              {recentCount} recientes
            </span>
          ) : (
            <Link
              href={orgPath(organizationSlug, '/player/matches')}
              className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C91F26] hover:underline"
            >
              Ver todos →
            </Link>
          )
        }
      >
        <LeagueMatchList
          items={playedLeague.slice(0, 5)}
          playerId={player.id}
          playerTeamId={playerWithTeam.teamId}
          organizationSlug={organizationSlug}
          variant="played"
          emptyText="Aún no has jugado partidos de liga."
        />
        <FriendlyMatchList
          items={playedFriendly.slice(0, 5)}
          organizationSlug={organizationSlug}
          variant="played"
          emptyText={
            playedLeague.length === 0 && playedFriendly.length === 0
              ? 'Aún no has jugado partidos.'
              : undefined
          }
        />
      </PlayerPanelSection>
    </div>
  )
}
