import { notFound } from 'next/navigation'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'

export const dynamic = 'force-dynamic'

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const snapshot = await getLiveMatchSnapshot(matchId)
  if (!snapshot) notFound()
  return <LiveScoreboard initialMatch={snapshot} />
}
