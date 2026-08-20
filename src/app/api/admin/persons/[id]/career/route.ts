import { NextResponse } from 'next/server'
import { MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { buildPersonCareer } from '@/lib/person-career'
import { MembershipRole } from '@/lib/membership-role'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: personId } = await params

  const person = await db.person.findUnique({
    where: { id: personId },
    include: {
      players: { select: { id: true, organizationId: true } },
    },
  })
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
  }

  const playerIds = person.players
    .filter((p) => p.organizationId === organizationId)
    .map((p) => p.id)
  if (playerIds.length === 0) {
    return NextResponse.json({ error: 'No puedes ver esta persona' }, { status: 403 })
  }

  const [callUps, friendlyParticipations, events, leagueMvps, friendlyMvps] = await Promise.all([
    db.callUp.findMany({
      where: { playerId: { in: playerIds } },
      select: { matchId: true, match: { select: { matchType: true } } },
    }),
    db.friendlyMatchPlayer.findMany({
      where: { playerId: { in: playerIds } },
      select: { matchId: true, match: { select: { matchType: true } } },
    }),
    db.matchEvent.findMany({
      where: {
        OR: [
          { playerId: { in: playerIds } },
          { assistPlayerId: { in: playerIds } },
        ],
      },
      select: {
        matchId: true,
        type: true,
        playerId: true,
        assistPlayerId: true,
        match: { select: { matchType: true } },
      },
    }),
    db.matchTeamMvp.count({
      where: { playerId: { in: playerIds }, match: { matchType: MatchType.LEAGUE } },
    }),
    db.matchTeamMvp.count({
      where: { playerId: { in: playerIds }, match: { matchType: MatchType.FRIENDLY } },
    }),
  ])

  const leagueMatchIds = [
    ...callUps.filter((c) => c.match.matchType === MatchType.LEAGUE).map((c) => c.matchId),
    ...events
      .filter(
        (e) =>
          e.match.matchType === MatchType.LEAGUE &&
          (playerIds.includes(e.playerId ?? '') || playerIds.includes(e.assistPlayerId ?? '')),
      )
      .map((e) => e.matchId),
  ]
  const friendlyMatchIds = [
    ...friendlyParticipations.map((p) => p.matchId),
    ...events
      .filter(
        (e) =>
          e.match.matchType === MatchType.FRIENDLY &&
          (playerIds.includes(e.playerId ?? '') || playerIds.includes(e.assistPlayerId ?? '')),
      )
      .map((e) => e.matchId),
  ]

  const careerEvents = events.flatMap((event) => {
    const rows: Array<{
      matchId: string
      matchType: MatchType
      type: typeof event.type
      isAssist: boolean
    }> = []

    const isGoal =
      playerIds.includes(event.playerId ?? '') &&
      (event.match.matchType === MatchType.LEAGUE || event.match.matchType === MatchType.FRIENDLY)
    const isAssist = playerIds.includes(event.assistPlayerId ?? '')

    if (isGoal) {
      rows.push({
        matchId: event.matchId,
        matchType: event.match.matchType,
        type: event.type,
        isAssist: false,
      })
    }
    if (isAssist) {
      rows.push({
        matchId: event.matchId,
        matchType: event.match.matchType,
        type: event.type,
        isAssist: true,
      })
    }
    return rows
  })

  return NextResponse.json(
    buildPersonCareer({
      person,
      leagueMatchIds,
      friendlyMatchIds,
      events: careerEvents,
      leagueMvpCount: leagueMvps,
      friendlyMvpCount: friendlyMvps,
    }),
  )
}
