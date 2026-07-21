import { db } from '@/lib/db'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { matchSideNames, eventTeamLabel } from '@/lib/match-label'
import {
  sortTimelineEvents,
  timelineUsesCreatedAtOrder,
} from '@/lib/match-timeline-sort'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

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
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!match) notFound()

  const sides = matchSideNames(match)
  const preferCreatedAt = timelineUsesCreatedAtOrder(match.clockStartedAt)
  const timelineEvents = sortTimelineEvents(match.events, { preferCreatedAt })

  const teamContext = {
    matchType: match.matchType,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  }

  return (
    <LiveScoreboard
      initialMatch={{
        id: match.id,
        matchType: match.matchType,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        sideAName: match.sideAName,
        sideBName: match.sideBName,
        homeTeam: { name: sides.home },
        awayTeam: { name: sides.away },
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        preferCreatedAtOrder: preferCreatedAt,
        clock: {
          status: match.status,
          clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
          secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
          halftimeAt: match.halftimeAt?.toISOString() ?? null,
        },
        events: timelineEvents.map((e) => ({
          id: e.id,
          type: e.type,
          minute: e.minute,
          createdAt: e.createdAt.toISOString(),
          playerName: e.friendlyPlayer
            ? `${e.friendlyPlayer.firstName} ${e.friendlyPlayer.lastName}`
            : (e.player?.user.name ?? null),
          teamName: eventTeamLabel(e, teamContext),
        })),
      }}
    />
  )
}