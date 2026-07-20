import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MatchControlPanel } from '@/components/referee/MatchControlPanel'
import { matchSideNames } from '@/lib/match-label'

async function getTeamPlayers(matchId: string, teamId: string) {
  const callUps = await db.callUp.findMany({
    where: { matchId, player: { teamId } },
    include: {
      player: {
        include: { user: { select: { name: true } } },
      },
    },
  })

  const players = callUps.map((c) => c.player)
  if (players.length > 0) return players

  return db.player.findMany({
    where: { teamId },
    include: { user: { select: { name: true } } },
    orderBy: { jerseyNumber: 'asc' },
  })
}

export default async function RefereeMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const match = await db.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  })

  if (!match) notFound()
  if (match.refereeId !== session.user.id) redirect('/referee')

  const panelProps = {
    matchId: match.id,
    initialHomeScore: match.homeScore,
    initialAwayScore: match.awayScore,
    initialStatus: match.status,
    initialClock: {
      status: match.status,
      clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
      secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
      halftimeAt: match.halftimeAt?.toISOString() ?? null,
    },
  }

  if (match.matchType === 'FRIENDLY') {
    const participations = await db.friendlyMatchPlayer.findMany({
      where: { matchId: match.id },
      include: { friendlyPlayer: true },
    })
    const sideA = participations.filter((p) => p.side === 'A')
    const sideB = participations.filter((p) => p.side === 'B')
    const { home, away } = matchSideNames(match)

    return (
      <MatchControlPanel
        {...panelProps}
        matchType="FRIENDLY"
        homeTeam={{
          id: 'A',
          name: home,
          players: sideA.map((p) => ({
            id: p.friendlyPlayerId,
            label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
          })),
        }}
        awayTeam={{
          id: 'B',
          name: away,
          players: sideB.map((p) => ({
            id: p.friendlyPlayerId,
            label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
          })),
        }}
      />
    )
  }

  if (!match.homeTeamId || !match.awayTeamId || !match.homeTeam || !match.awayTeam) {
    notFound()
  }

  const [homePlayers, awayPlayers] = await Promise.all([
    getTeamPlayers(match.id, match.homeTeamId),
    getTeamPlayers(match.id, match.awayTeamId),
  ])

  return (
    <MatchControlPanel
      {...panelProps}
      matchType="LEAGUE"
      homeTeam={{
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        players: homePlayers.map((p) => ({
          id: p.id,
          label: p.user.name,
        })),
      }}
      awayTeam={{
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        players: awayPlayers.map((p) => ({
          id: p.id,
          label: p.user.name,
        })),
      }}
    />
  )
}
