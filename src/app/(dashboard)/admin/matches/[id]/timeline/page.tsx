import { db } from '@/lib/db'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { MatchTimelineEditor } from '@/components/admin/MatchTimelineEditor'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MatchType } from '@prisma/client'

async function getLeaguePlayers(matchId: string, homeTeamId: string, awayTeamId: string) {
  const callUps = await db.callUp.findMany({
    where: { matchId },
    include: { player: { include: { user: { select: { name: true } } } } },
  })

  if (callUps.length > 0) {
    return callUps.map((c) => ({
      id: c.playerId,
      label: c.player.user.name,
      teamId: c.player.teamId,
    }))
  }

  const players = await db.player.findMany({
    where: { teamId: { in: [homeTeamId, awayTeamId] } },
    include: { user: { select: { name: true } } },
    orderBy: { jerseyNumber: 'asc' },
  })

  return players.map((p) => ({
    id: p.id,
    label: p.user.name,
    teamId: p.teamId,
  }))
}

export default async function AdminMatchTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const match = await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        include: {
          player: { include: { user: { select: { name: true } } } },
          friendlyPlayer: { select: { firstName: true, lastName: true } },
          assistPlayer: { include: { user: { select: { name: true } } } },
          assistFriendlyPlayer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { minute: 'asc' },
      },
      friendlyPlayers: { include: { friendlyPlayer: true } },
    },
  })

  if (!match) notFound()

  const sides = matchSideNames(match)
  const title = matchDisplayName(match)

  let players: { id: string; label: string; teamId?: string | null; side?: 'A' | 'B' }[] = []

  if (match.matchType === MatchType.FRIENDLY) {
    players = match.friendlyPlayers.map((p) => ({
      id: p.friendlyPlayerId,
      label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
      side: p.side,
    }))
  } else if (match.homeTeamId && match.awayTeamId) {
    players = await getLeaguePlayers(match.id, match.homeTeamId, match.awayTeamId)
  }

  const timelineEvents = match.events.map((e) => ({
    id: e.id,
    type: e.type,
    minute: e.minute,
    playerId: e.playerId,
    teamId: e.teamId,
    friendlyPlayerId: e.friendlyPlayerId,
    assistPlayerId: e.assistPlayerId,
    assistFriendlyPlayerId: e.assistFriendlyPlayerId,
    side: e.side,
    description: e.description,
    playerName: e.friendlyPlayer
      ? `${e.friendlyPlayer.firstName} ${e.friendlyPlayer.lastName}`
      : (e.player?.user.name ?? null),
    assistName: e.assistFriendlyPlayer
      ? `${e.assistFriendlyPlayer.firstName} ${e.assistFriendlyPlayer.lastName}`
      : (e.assistPlayer?.user.name ?? null),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/matches" className="text-sm text-kelme-red hover:underline">
          ← Partidos
        </Link>
        <h1 className="font-display text-2xl font-bold">Cronología — {title}</h1>
      </div>
      <p className="text-sm text-kelme-gray-400">
        Marcador actual: {match.homeScore} - {match.awayScore} · {match.status}
      </p>
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
