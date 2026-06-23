import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MatchControlPanel } from '@/components/referee/MatchControlPanel'

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

  const [homePlayers, awayPlayers] = await Promise.all([
    getTeamPlayers(match.id, match.homeTeamId),
    getTeamPlayers(match.id, match.awayTeamId),
  ])

  return (
    <MatchControlPanel
      matchId={match.id}
      homeTeam={{ ...match.homeTeam, players: homePlayers }}
      awayTeam={{ ...match.awayTeam, players: awayPlayers }}
      initialHomeScore={match.homeScore}
      initialAwayScore={match.awayScore}
      initialStatus={match.status}
    />
  )
}
