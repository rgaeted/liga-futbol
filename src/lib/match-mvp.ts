import type { MatchMvpSide, MatchType } from '@prisma/client'
import { friendlyPlayerPhotoUrl } from '@/lib/friendly-player-photo'
import { matchMvpPhotoUrl, matchTeamMvpHasPhoto } from '@/lib/match-mvp-photo'

export type TeamMvpSideView = {
  side: MatchMvpSide
  teamLabel: string
  playerId: string | null
  label: string | null
  photoUrl: string | null
}

type TeamMvpRow = {
  side: MatchMvpSide
  playerId: string | null
  friendlyPlayerId: string | null
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
  player?: { user: { name: string } } | null
  friendlyPlayer?: {
    firstName: string
    lastName: string
    photoMimeType?: string | null
  } | null
}

export function resolveTeamMvpPlayerId(row: TeamMvpRow): string | null {
  return row.friendlyPlayerId ?? row.playerId
}

export function resolveTeamMvpLabel(row: TeamMvpRow): string | null {
  if (row.friendlyPlayer) {
    return `${row.friendlyPlayer.firstName} ${row.friendlyPlayer.lastName}`.trim()
  }
  return row.player?.user.name ?? null
}

export function resolveTeamMvpPhotoUrl(
  matchId: string,
  row: TeamMvpRow
): string | null {
  if (matchTeamMvpHasPhoto(row)) {
    return matchMvpPhotoUrl(matchId, row.side)
  }
  if (row.friendlyPlayerId && row.friendlyPlayer?.photoMimeType) {
    return friendlyPlayerPhotoUrl(row.friendlyPlayerId)
  }
  return null
}

export function buildTeamMvpView(
  matchId: string,
  side: MatchMvpSide,
  teamLabel: string,
  row: TeamMvpRow | null | undefined
): TeamMvpSideView {
  if (!row) {
    return { side, teamLabel, playerId: null, label: null, photoUrl: null }
  }
  return {
    side,
    teamLabel,
    playerId: resolveTeamMvpPlayerId(row),
    label: resolveTeamMvpLabel(row),
    photoUrl: resolveTeamMvpPhotoUrl(matchId, row),
  }
}

export function buildMatchTeamMvps(input: {
  matchId: string
  homeLabel: string
  awayLabel: string
  rows: TeamMvpRow[]
}): TeamMvpSideView[] {
  const home = input.rows.find((r) => r.side === 'HOME')
  const away = input.rows.find((r) => r.side === 'AWAY')
  return [
    buildTeamMvpView(input.matchId, 'HOME', input.homeLabel, home),
    buildTeamMvpView(input.matchId, 'AWAY', input.awayLabel, away),
  ]
}

export function teamMvpPlayerIds(views: TeamMvpSideView[]): string[] {
  return views.map((v) => v.playerId).filter((id): id is string => Boolean(id))
}

export async function assertMvpInMatchRoster(
  db: {
    callUp: { findFirst: (args: object) => Promise<{ id: string } | null> }
    friendlyMatchPlayer: { findFirst: (args: object) => Promise<{ id: string; side: string } | null> }
    player: { findFirst: (args: object) => Promise<{ id: string } | null> }
  },
  match: {
    id: string
    matchType: MatchType
    homeTeamId: string | null
    awayTeamId: string | null
  },
  side: MatchMvpSide,
  input: { playerId?: string | null; friendlyPlayerId?: string | null }
): Promise<string | null> {
  if (match.matchType === 'FRIENDLY') {
    const friendlyPlayerId = input.friendlyPlayerId
    if (!friendlyPlayerId) return null
    const row = await db.friendlyMatchPlayer.findFirst({
      where: { matchId: match.id, friendlyPlayerId },
      select: { id: true, side: true },
    })
    if (!row) return 'El MVP debe ser un jugador del partido'
    const expectedSide = side === 'HOME' ? 'A' : 'B'
    if (row.side !== expectedSide) {
      return 'El MVP debe ser un jugador de ese equipo'
    }
    return null
  }

  const playerId = input.playerId
  if (!playerId) return null

  const expectedTeamId = side === 'HOME' ? match.homeTeamId : match.awayTeamId
  if (!expectedTeamId) return 'Equipo no encontrado'

  const inCallUp = await db.callUp.findFirst({
    where: { matchId: match.id, playerId, player: { teamId: expectedTeamId } },
    select: { id: true },
  })
  if (inCallUp) return null

  const onTeam = await db.player.findFirst({
    where: { id: playerId, teamId: expectedTeamId },
    select: { id: true },
  })
  if (onTeam) return null

  return 'El MVP debe ser un jugador de ese equipo'
}

export const MATCH_MVP_INCLUDE = {
  player: { include: { user: { select: { name: true } } } },
  friendlyPlayer: {
    select: { firstName: true, lastName: true, photoMimeType: true },
  },
} as const
