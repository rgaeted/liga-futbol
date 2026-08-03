import { MatchType, type FootballFormat, type Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { SerializableClockState } from '@/hooks/useMatchClock'
import { formatChileLocation } from '@/lib/chile-locations'
import {
  friendlyCaptainPlayerIds,
  resolveFriendlyCaptains,
} from '@/lib/friendly-match-captain'
import { resolveFriendlyCoaches } from '@/lib/friendly-match-coach'
import { matchSideNames, resolveEventTeamCrest, resolveEventTeamLabel } from '@/lib/match-label'
import { buildMatchFormationSides } from '@/lib/match-formations'
import { matchSideCrestUrl, matchSideHasCrest } from '@/lib/match-side-crest'
import {
  buildMatchTeamMvps,
  MATCH_MVP_INCLUDE,
  teamMvpPlayerIds,
  type TeamMvpSideView,
} from '@/lib/match-mvp'
import { sortTimelineEvents, timelineUsesCreatedAtOrder } from '@/lib/match-timeline-sort'
import { teamCrestUrl, teamHasCrest } from '@/lib/team-crest'
import {
  resolveEventTeamColor,
  resolveMatchSideColor,
  resolveTeamColor,
} from '@/lib/team-color'
import type { LineupView } from '@/lib/match-lineup'

export type LiveMatchWeather = {
  label: string
  tempC: number
  humidityPct: number
  windKmh: number
}

export type LiveMatchEvent = {
  id: string
  type: string
  minute: number
  createdAt: string
  playerName: string | null
  assistName: string | null
  teamName: string | null
  teamCrestSrc: string | null
  teamColor: string | null
}

export type LiveMatchFormation = {
  label: string
  crestSrc: string | null
  color?: string
  coachLabel: string | null
  lineup: LineupView | null
}

export type LiveMatchSnapshot = {
  id: string
  matchType: MatchType
  homeTeamId: string | null
  awayTeamId: string | null
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string; crestSrc: string | null; color: string }
  awayTeam: { name: string; crestSrc: string | null; color: string }
  homeScore: number
  awayScore: number
  status: string
  preferCreatedAtOrder: boolean
  friendlySideByPlayer: Record<string, 'A' | 'B'>
  clock: SerializableClockState
  events: LiveMatchEvent[]
  footballFormat: FootballFormat
  teamMvps: TeamMvpSideView[]
  mvpPlayerIds: string[]
  captainPlayerIds: string[]
  homeCaptainLabel: string | null
  awayCaptainLabel: string | null
  homeCoachLabel: string | null
  awayCoachLabel: string | null
  venue: string | null
  locationLabel: string | null
  weather: LiveMatchWeather | null
  formations: LiveMatchFormation[]
}

const LIVE_MATCH_INCLUDE = {
  homeTeam: { include: { coach: { select: { name: true } } } },
  awayTeam: { include: { coach: { select: { name: true } } } },
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
} satisfies Prisma.MatchInclude

export type LiveMatchRecord = Prisma.MatchGetPayload<{
  include: typeof LIVE_MATCH_INCLUDE
}>

export function buildLiveMatchSnapshot(match: LiveMatchRecord): LiveMatchSnapshot {
  const sides = matchSideNames(match)
  const preferCreatedAtOrder = timelineUsesCreatedAtOrder(match.clockStartedAt)
  const events = sortTimelineEvents(match.events, {
    preferCreatedAt: preferCreatedAtOrder,
  })
  const friendlySideByPlayer = new Map(
    match.friendlyPlayers.map((player) => [player.friendlyPlayerId, player.side])
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
    callUps: match.callUps.map((callUp) => ({
      playerId: callUp.playerId,
      slotKey: callUp.slotKey,
      player: {
        teamId: callUp.player.teamId,
        user: callUp.player.user,
      },
    })),
    friendlyPlayers: match.friendlyPlayers.map((player) => ({
      friendlyPlayerId: player.friendlyPlayerId,
      side: player.side,
      slotKey: player.slotKey,
      friendlyPlayer: player.friendlyPlayer,
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
  const teamContext = {
    matchType: match.matchType,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  }
  const teamMvps = buildMatchTeamMvps({
    matchId: match.id,
    homeLabel: sides.home,
    awayLabel: sides.away,
    rows: match.teamMvps,
  })
  const friendlyCaptains =
    match.matchType === MatchType.FRIENDLY
      ? resolveFriendlyCaptains(match.friendlyPlayers)
      : []
  const friendlyCoaches =
    match.matchType === MatchType.FRIENDLY
      ? resolveFriendlyCoaches(match.friendlyPlayers)
      : []
  const homeCaptainLabel =
    friendlyCaptains.find((captain) => captain.side === 'A')?.label ?? null
  const awayCaptainLabel =
    friendlyCaptains.find((captain) => captain.side === 'B')?.label ?? null
  const homeCoachLabel =
    match.matchType === MatchType.FRIENDLY
      ? friendlyCoaches.find((coach) => coach.side === 'A')?.label ?? null
      : match.homeTeam?.coach?.name ?? null
  const awayCoachLabel =
    match.matchType === MatchType.FRIENDLY
      ? friendlyCoaches.find((coach) => coach.side === 'B')?.label ?? null
      : match.awayTeam?.coach?.name ?? null
  const weather =
    match.weatherTempC !== null &&
    match.weatherHumidityPct !== null &&
    match.weatherWindKmh !== null &&
    match.weatherLabel
      ? {
          label: match.weatherLabel,
          tempC: match.weatherTempC,
          humidityPct: match.weatherHumidityPct,
          windKmh: match.weatherWindKmh,
        }
      : null

  return {
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
    preferCreatedAtOrder,
    friendlySideByPlayer: Object.fromEntries(friendlySideByPlayer) as Record<
      string,
      'A' | 'B'
    >,
    clock: {
      status: match.status,
      clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
      secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
      halftimeAt: match.halftimeAt?.toISOString() ?? null,
    },
    events: events.map((event) => {
      const teamName = resolveEventTeamLabel(
        {
          teamId: event.teamId,
          side: event.side,
          playerTeamId: event.player?.team?.id ?? event.player?.teamId ?? null,
          playerTeamName: event.player?.team?.name ?? null,
          friendlyPlayerId: event.friendlyPlayerId,
          friendlySide: event.friendlyPlayerId
            ? friendlySideByPlayer.get(event.friendlyPlayerId) ?? null
            : null,
        },
        teamContext
      )
      return {
        id: event.id,
        type: event.type,
        minute: event.minute,
        createdAt: event.createdAt.toISOString(),
        playerName: event.friendlyPlayer
          ? `${event.friendlyPlayer.firstName} ${event.friendlyPlayer.lastName}`
          : event.player?.user.name ?? null,
        assistName: event.assistFriendlyPlayer
          ? `${event.assistFriendlyPlayer.firstName} ${event.assistFriendlyPlayer.lastName}`
          : event.assistPlayer?.user.name ?? null,
        teamName,
        teamCrestSrc: resolveEventTeamCrest(teamName, teamVisual),
        teamColor: resolveEventTeamColor(teamName, teamVisual),
      }
    }),
    footballFormat: match.footballFormat,
    teamMvps,
    mvpPlayerIds: teamMvpPlayerIds(teamMvps),
    captainPlayerIds: friendlyCaptainPlayerIds(friendlyCaptains),
    homeCaptainLabel,
    awayCaptainLabel,
    homeCoachLabel,
    awayCoachLabel,
    venue: match.venue,
    locationLabel: formatChileLocation(match.regionName, match.communeName),
    weather,
    formations: formationSides.map((side) => ({
      label: side.label,
      lineup: side.lineup,
      crestSrc:
        side.label === sides.home
          ? homeCrestSrc
          : side.label === sides.away
            ? awayCrestSrc
            : null,
      color:
        side.label === sides.home
          ? homeColor
          : side.label === sides.away
            ? awayColor
            : undefined,
      coachLabel:
        side.label === sides.home
          ? homeCoachLabel
          : side.label === sides.away
            ? awayCoachLabel
            : null,
    })),
  }
}

export async function getLiveMatchSnapshot(
  matchId: string
): Promise<LiveMatchSnapshot | null> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: LIVE_MATCH_INCLUDE,
  })
  return match ? buildLiveMatchSnapshot(match) : null
}
