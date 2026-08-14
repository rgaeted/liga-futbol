import { NextResponse } from 'next/server'
import { MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { buildPersonCareer } from '@/lib/person-career'
import { MembershipRole } from '@/lib/membership-role'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: personId } = await params

  const person = await db.person.findUnique({
    where: { id: personId },
    include: {
      players: { select: { id: true, organizationId: true } },
      friendlyPlayers: { select: { id: true, organizationId: true } },
    },
  })
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
  }

  const hasFichaInOrg =
    person.players.some((p) => p.organizationId === organizationId) ||
    person.friendlyPlayers.some((p) => p.organizationId === organizationId)
  if (!hasFichaInOrg) {
    return NextResponse.json({ error: 'No puedes ver esta persona' }, { status: 403 })
  }

  const leagueFichaIds = person.players
    .filter((p) => p.organizationId === organizationId)
    .map((p) => p.id)
  const friendlyFichaIds = person.friendlyPlayers
    .filter((p) => p.organizationId === organizationId)
    .map((p) => p.id)

  const [callUps, friendlyParticipations, events, leagueMvps, friendlyMvps] = await Promise.all([
    db.callUp.findMany({
      where: { playerId: { in: leagueFichaIds } },
      select: { matchId: true, match: { select: { matchType: true } } },
    }),
    db.friendlyMatchPlayer.findMany({
      where: { friendlyPlayerId: { in: friendlyFichaIds } },
      select: { matchId: true, match: { select: { matchType: true } } },
    }),
    db.matchEvent.findMany({
      where: {
        OR: [
          { playerId: { in: leagueFichaIds } },
          { friendlyPlayerId: { in: friendlyFichaIds } },
          { assistPlayerId: { in: leagueFichaIds } },
          { assistFriendlyPlayerId: { in: friendlyFichaIds } },
        ],
      },
      select: {
        matchId: true,
        type: true,
        playerId: true,
        friendlyPlayerId: true,
        assistPlayerId: true,
        assistFriendlyPlayerId: true,
        match: { select: { matchType: true } },
      },
    }),
    db.matchTeamMvp.count({
      where: { playerId: { in: leagueFichaIds }, match: { matchType: MatchType.LEAGUE } },
    }),
    db.matchTeamMvp.count({
      where: {
        friendlyPlayerId: { in: friendlyFichaIds },
        match: { matchType: MatchType.FRIENDLY },
      },
    }),
  ])

  const leagueMatchIds = [
    ...callUps.filter((c) => c.match.matchType === MatchType.LEAGUE).map((c) => c.matchId),
    ...events
      .filter(
        (e) =>
          e.match.matchType === MatchType.LEAGUE &&
          (leagueFichaIds.includes(e.playerId ?? '') ||
            leagueFichaIds.includes(e.assistPlayerId ?? '')),
      )
      .map((e) => e.matchId),
  ]
  const friendlyMatchIds = [
    ...friendlyParticipations.map((p) => p.matchId),
    ...events
      .filter(
        (e) =>
          e.match.matchType === MatchType.FRIENDLY &&
          (friendlyFichaIds.includes(e.friendlyPlayerId ?? '') ||
            friendlyFichaIds.includes(e.assistFriendlyPlayerId ?? '')),
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

    const isLeagueGoal =
      leagueFichaIds.includes(event.playerId ?? '') &&
      event.match.matchType === MatchType.LEAGUE
    const isFriendlyGoal =
      friendlyFichaIds.includes(event.friendlyPlayerId ?? '') &&
      event.match.matchType === MatchType.FRIENDLY
    const isLeagueAssist =
      leagueFichaIds.includes(event.assistPlayerId ?? '') &&
      event.match.matchType === MatchType.LEAGUE
    const isFriendlyAssist =
      friendlyFichaIds.includes(event.assistFriendlyPlayerId ?? '') &&
      event.match.matchType === MatchType.FRIENDLY

    if (isLeagueGoal || isFriendlyGoal) {
      rows.push({
        matchId: event.matchId,
        matchType: event.match.matchType,
        type: event.type,
        isAssist: false,
      })
    }
    if (isLeagueAssist || isFriendlyAssist) {
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
