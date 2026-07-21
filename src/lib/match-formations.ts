import { MatchType, type FootballFormat, type MatchFormation } from '@prisma/client'
import { buildLineupView, type LineupView } from '@/lib/match-lineup'
import { matchSideNames } from '@/lib/match-label'
import { normalizeSchemeForFormat } from '@/lib/formations'

export type FormationSideView = {
  key: string
  label: string
  lineup: LineupView | null
}

type LeagueCallUp = {
  playerId: string
  slotKey: string | null
  player: {
    teamId: string | null
    user: { name: string }
  }
}

type FriendlyParticipation = {
  friendlyPlayerId: string
  side: 'A' | 'B'
  slotKey: string | null
  friendlyPlayer: { firstName: string; lastName: string }
}

type MatchFormationInput = {
  matchType: MatchType
  footballFormat: FootballFormat
  sideAName: string | null
  sideBName: string | null
  homeTeam: { id: string; name: string } | null
  awayTeam: { id: string; name: string } | null
  homeTeamId: string | null
  awayTeamId: string | null
  formations: MatchFormation[]
  callUps: LeagueCallUp[]
  friendlyPlayers: FriendlyParticipation[]
}

function leagueSide(
  teamId: string,
  label: string,
  footballFormat: FootballFormat,
  formations: MatchFormation[],
  callUps: LeagueCallUp[]
): FormationSideView {
  const formation = formations.find((f) => f.teamId === teamId)
  if (!formation) return { key: teamId, label, lineup: null }

  const teamCallUps = callUps.filter((c) => c.player.teamId === teamId)
  const scheme = normalizeSchemeForFormat(formation.scheme, footballFormat)
  return {
    key: teamId,
    label,
    lineup: buildLineupView({
      scheme,
      footballFormat,
      assignments: teamCallUps
        .filter((c) => c.slotKey)
        .map((c) => ({
          slotKey: c.slotKey!,
          playerId: c.playerId,
          playerName: c.player.user.name,
        })),
      bench: teamCallUps
        .filter((c) => !c.slotKey)
        .map((c) => ({ playerId: c.playerId, playerName: c.player.user.name })),
    }),
  }
}

function friendlySide(
  side: 'A' | 'B',
  label: string,
  footballFormat: FootballFormat,
  formations: MatchFormation[],
  participations: FriendlyParticipation[]
): FormationSideView {
  const formation = formations.find((f) => f.side === side)
  if (!formation) return { key: side, label, lineup: null }

  const sideParts = participations.filter((p) => p.side === side)
  const scheme = normalizeSchemeForFormat(formation.scheme, footballFormat)
  return {
    key: side,
    label,
    lineup: buildLineupView({
      scheme,
      footballFormat,
      assignments: sideParts
        .filter((p) => p.slotKey)
        .map((p) => ({
          slotKey: p.slotKey!,
          playerId: p.friendlyPlayerId,
          playerName: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
        })),
      bench: sideParts
        .filter((p) => !p.slotKey)
        .map((p) => ({
          playerId: p.friendlyPlayerId,
          playerName: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
        })),
    }),
  }
}

export function buildMatchFormationSides(match: MatchFormationInput): FormationSideView[] {
  const sides = matchSideNames(match)

  if (match.matchType === MatchType.FRIENDLY) {
    return [
      friendlySide('A', sides.home, match.footballFormat, match.formations, match.friendlyPlayers),
      friendlySide('B', sides.away, match.footballFormat, match.formations, match.friendlyPlayers),
    ]
  }

  const result: FormationSideView[] = []
  if (match.homeTeamId && match.homeTeam) {
    result.push(
      leagueSide(
        match.homeTeamId,
        match.homeTeam.name,
        match.footballFormat,
        match.formations,
        match.callUps
      )
    )
  }
  if (match.awayTeamId && match.awayTeam) {
    result.push(
      leagueSide(
        match.awayTeamId,
        match.awayTeam.name,
        match.footballFormat,
        match.formations,
        match.callUps
      )
    )
  }
  return result
}
