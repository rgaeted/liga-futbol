import { db } from '@/lib/db'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { matchSideNames } from '@/lib/match-label'
import { notFound } from 'next/navigation'

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        include: {
          player: { include: { user: { select: { name: true } } } },
          friendlyPlayer: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!match) notFound()

  const sides = matchSideNames(match)

  return (
    <LiveScoreboard
      initialMatch={{
        id: match.id,
        homeTeam: { name: sides.home },
        awayTeam: { name: sides.away },
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        clock: {
          status: match.status,
          clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
          secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
          halftimeAt: match.halftimeAt?.toISOString() ?? null,
        },
        events: match.events.map((e) => ({
          id: e.id,
          type: e.type,
          minute: e.minute,
          playerName: e.friendlyPlayer
            ? `${e.friendlyPlayer.firstName} ${e.friendlyPlayer.lastName}`
            : (e.player?.user.name ?? null),
        })),
      }}
    />
  )
}