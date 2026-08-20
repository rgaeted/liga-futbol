import { db } from '@/lib/db'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { matchStatusLabel } from '@/lib/match-status-ui'
import { MatchTimelineEditor } from '@/components/admin/MatchTimelineEditor'
import { MatchTeamMvpEditor } from '@/components/match/MatchTeamMvpEditor'
import { buildMatchTeamMvps, MATCH_MVP_INCLUDE } from '@/lib/match-mvp'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MatchType } from '@prisma/client'
import { orgPath } from '@/lib/tenant-paths'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

async function getLeaguePlayers(matchId: string, homeTeamId: string, awayTeamId: string) {
  const callUps = await db.callUp.findMany({
    where: { matchId },
    include: { player: { include: PLAYER_PERSON_NAME_INCLUDE } },
  })

  if (callUps.length > 0) {
    return callUps.map((c) => ({
      id: c.playerId,
      label: playerDisplayName(c.player),
      teamId: c.player.teamId,
    }))
  }

  const players = await db.player.findMany({
    where: { teamId: { in: [homeTeamId, awayTeamId] } },
    include: PLAYER_PERSON_NAME_INCLUDE,
    orderBy: { jerseyNumber: 'asc' },
  })

  return players.map((p) => ({
    id: p.id,
    label: playerDisplayName(p),
    teamId: p.teamId,
  }))
}

export default async function AdminMatchTimelinePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; id: string }>
}) {
  const { organizationSlug, id } = await params

  const match = await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        include: {
          player: { include: PLAYER_PERSON_NAME_INCLUDE },
          assistPlayer: { include: PLAYER_PERSON_NAME_INCLUDE },
        },
        orderBy: { minute: 'asc' },
      },
      friendlyPlayers: {
        include: {
          player: { include: PLAYER_PERSON_NAME_INCLUDE },
        },
      },
      teamMvps: { include: MATCH_MVP_INCLUDE },
    },
  })

  if (!match) notFound()

  const sides = matchSideNames(match)
  const title = matchDisplayName(match)

  let players: { id: string; label: string; teamId?: string | null; side?: 'A' | 'B' }[] = []

  if (match.matchType === MatchType.FRIENDLY) {
    players = match.friendlyPlayers.map((p) => ({
      id: p.playerId,
      label: playerDisplayName(p.player),
      side: p.side,
    }))
  } else if (match.homeTeamId && match.awayTeamId) {
    players = await getLeaguePlayers(match.id, match.homeTeamId, match.awayTeamId)
  }

  const homePlayers =
    match.matchType === MatchType.FRIENDLY
      ? players.filter((p) => p.side === 'A')
      : players.filter((p) => p.teamId === match.homeTeamId)
  const awayPlayers =
    match.matchType === MatchType.FRIENDLY
      ? players.filter((p) => p.side === 'B')
      : players.filter((p) => p.teamId === match.awayTeamId)

  const teamMvps = buildMatchTeamMvps({
    matchId: match.id,
    homeLabel: sides.home,
    awayLabel: sides.away,
    rows: match.teamMvps,
  })

  const mvpSummary = teamMvps
    .filter((m) => m.label)
    .map((m) => `${m.teamLabel}: ${m.label}`)
    .join(' · ')

  const timelineEvents = match.events.map((e) => ({
    id: e.id,
    type: e.type,
    minute: e.minute,
    playerId: e.playerId,
    teamId: e.teamId,
    assistPlayerId: e.assistPlayerId,
    side: e.side,
    description: e.description,
    playerName: e.player ? playerDisplayName(e.player) : null,
    assistName: e.assistPlayer ? playerDisplayName(e.assistPlayer) : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={orgPath(organizationSlug, '/admin/matches')} className="text-sm text-kelme-red hover:underline">
          ← Partidos
        </Link>
        <h1 className="font-display text-2xl font-bold">Cronología — {title}</h1>
      </div>
      <p className="text-sm text-kelme-gray-400">
        Marcador actual: {match.homeScore} - {match.awayScore} · {matchStatusLabel(match.status)}
        {mvpSummary && (
          <span className="ml-2 font-semibold text-amber-700">· ⭐ {mvpSummary}</span>
        )}
      </p>
      <MatchTeamMvpEditor
        matchId={match.id}
        matchType={match.matchType}
        matchStatus={match.status}
        homeTeam={{ label: sides.home, players: homePlayers.map((p) => ({ id: p.id, label: p.label })) }}
        awayTeam={{ label: sides.away, players: awayPlayers.map((p) => ({ id: p.id, label: p.label })) }}
        teamMvps={teamMvps}
      />
      <MatchTimelineEditor
        matchId={match.id}
        matchType={match.matchType}
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        homeLabel={sides.home}
        awayLabel={sides.away}
        players={players}
        initialEvents={timelineEvents}
      />
    </div>
  )
}
