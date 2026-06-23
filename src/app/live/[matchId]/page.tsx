import { db } from '@/lib/db'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
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
        include: { player: { include: { user: { select: { name: true } } } } },
        orderBy: { minute: 'asc' },
      },
    },
  })

  if (!match) notFound()

  return <LiveScoreboard initialMatch={match} />
}
