import { db } from '@/lib/db'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { matchSideNames, resolveEventTeamLabel, resolveEventTeamCrest } from '@/lib/match-label'
import { buildMatchFormationSides } from '@/lib/match-formations'
import { buildMatchTeamMvps, MATCH_MVP_INCLUDE, teamMvpPlayerIds } from '@/lib/match-mvp'
import { matchSideCrestUrl, matchSideHasCrest } from '@/lib/match-side-crest'
import { teamCrestUrl, teamHasCrest } from '@/lib/team-crest'
import { resolveEventTeamColor, resolveMatchSideColor, resolveTeamColor } from '@/lib/team-color'
import {
  sortTimelineEvents,
  timelineUsesCreatedAtOrder,
} from '@/lib/match-timeline-sort'
import { notFound } from 'next/navigation'
import { MatchType } from '@prisma/client'

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
      formations: true,
      callUps: {
        include: {
          player: {
            include: {
              user: { select: { name: true } },
              team: { select: { id: true } },
            },
          },
        },
      },
      friendlyPlayers: {
        include: {
          friendlyPlayer: {
            select: { firstName: true, lastName: true, photoMimeType: true },
          },
        },
      },
      teamMvps: { include: MATCH_MVP_INCLUDE },
      events: {
        include: {
          player: {
            include: {
              user: { select: { name: true } },
              team: { select: { id: true, name: true } },
            },
          },
          friendlyPlayer: { select: { firstName: true, lastName: true } },
          assistPlayer: { include: { user: { select: { name: true } } } },
          assistFriendlyPlayer: { select: { firstName: true, lastName: true } },
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

  const friendlySideByPlayer = new Map(
    match.friendlyPlayers.map((p) => [p.friendlyPlayerId, p.side])
  )

  const formationSides = buildMatchFormationSides({
    matchType: match.matchType,
    footballFormat: match.footballFormat,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    formations: match.formations,
    callUps: match.callUps.map((c) => ({
      playerId: c.playerId,
      slotKey: c.slotKey,
      player: {
        teamId: c.player.teamId,
        user: c.player.user,
      },
    })),
    friendlyPlayers: match.friendlyPlayers.map((p) => ({
      friendlyPlayerId: p.friendlyPlayerId,
      side: p.side,
      slotKey: p.slotKey,
      friendlyPlayer: p.friendlyPlayer,
    })),
  })

  const homeCrestSrc =
    match.matchType === MatchType.FRIENDLY
      ? matchSideHasCrest(match, 'A')
        ? matchSideCrestUrl(match.id, 'A')
        : null
      : match.homeTeam && teamHasCrest(match.homeTeam)
        ? teamCrestUrl(match.homeTeam.id)
        : null

  const awayCrestSrc =
    match.matchType === MatchType.FRIENDLY
      ? matchSideHasCrest(match, 'B')
        ? matchSideCrestUrl(match.id, 'B')
        : null
      : match.awayTeam && teamHasCrest(match.awayTeam)
        ? teamCrestUrl(match.awayTeam.id)
        : null

  const homeColor =
    match.matchType === MatchType.FRIENDLY
      ? resolveMatchSideColor(match.sideAColor, sides.home)
      : match.homeTeam
        ? resolveTeamColor(match.homeTeam.color, match.homeTeam.name)
        : resolveTeamColor(null, sides.home)

  const awayColor =
    match.matchType === MatchType.FRIENDLY
      ? resolveMatchSideColor(match.sideBColor, sides.away)
      : match.awayTeam
        ? resolveTeamColor(match.awayTeam.color, match.awayTeam.name)
        : resolveTeamColor(null, sides.away)

  const teamVisual = {
    homeName: sides.home,
    awayName: sides.away,
    homeCrestSrc,
    awayCrestSrc,
    homeColor,
    awayColor,
  }

  const teamMvps = buildMatchTeamMvps({
    matchId: match.id,
    homeLabel: sides.home,
    awayLabel: sides.away,
    rows: match.teamMvps,
  })

  return (
    <LiveScoreboard
      initialMatch={{
        id: match.id,
        matchType: match.matchType,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        sideAName: match.sideAName,
        sideBName: match.sideBName,
        homeTeam: { name: sides.home, crestSrc: homeCrestSrc, color: homeColor },
        awayTeam: { name: sides.away, crestSrc: awayCrestSrc, color: awayColor },
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        preferCreatedAtOrder: preferCreatedAt,
        friendlySideByPlayer: Object.fromEntries(
          match.friendlyPlayers.map((p) => [p.friendlyPlayerId, p.side])
        ) as Record<string, 'A' | 'B'>,
        clock: {
          status: match.status,
          clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
          secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
          halftimeAt: match.halftimeAt?.toISOString() ?? null,
        },
        events: timelineEvents.map((e) => {
          const teamName = resolveEventTeamLabel(
            {
              teamId: e.teamId,
              side: e.side,
              playerTeamId: e.player?.team?.id ?? e.player?.teamId ?? null,
              playerTeamName: e.player?.team?.name ?? null,
              friendlyPlayerId: e.friendlyPlayerId,
              friendlySide: e.friendlyPlayerId
                ? friendlySideByPlayer.get(e.friendlyPlayerId) ?? null
                : null,
            },
            teamContext
          )
          return {
            id: e.id,
            type: e.type,
            minute: e.minute,
            createdAt: e.createdAt.toISOString(),
            playerName: e.friendlyPlayer
              ? `${e.friendlyPlayer.firstName} ${e.friendlyPlayer.lastName}`
              : (e.player?.user.name ?? null),
            assistName: e.assistFriendlyPlayer
              ? `${e.assistFriendlyPlayer.firstName} ${e.assistFriendlyPlayer.lastName}`
              : (e.assistPlayer?.user.name ?? null),
            teamName,
            teamCrestSrc: resolveEventTeamCrest(teamName, teamVisual),
            teamColor: resolveEventTeamColor(teamName, teamVisual),
          }
        }),
        footballFormat: match.footballFormat,
        teamMvps,
        mvpPlayerIds: teamMvpPlayerIds(teamMvps),
        formations: formationSides.map((s) => ({
          label: s.label,
          lineup: s.lineup,
          crestSrc: s.label === sides.home ? homeCrestSrc : s.label === sides.away ? awayCrestSrc : null,
          color: s.label === sides.home ? homeColor : s.label === sides.away ? awayColor : undefined,
        })),
      }}
    />
  )
}