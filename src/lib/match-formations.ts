import { MatchType, type FootballFormat, type MatchFormation, type Prisma } from '@prisma/client'
import { friendlyPlayerPhotoUrl } from '@/lib/friendly-player-photo'
import { buildLineupView, type LineupView } from '@/lib/match-lineup'
import { matchSideNames } from '@/lib/match-label'
import { normalizeSchemeForFormat } from '@/lib/formations'
import { type SlotLayout } from '@/lib/formation-slot-layout'
import { playerDisplayName, type PlayerNameSource } from '@/lib/person-name'

export type FormationSideView = {
  key: string
  label: string
  slotLayout: SlotLayout | null
  lineup: LineupView | null
}

function parseSlotLayout(raw: Prisma.JsonValue | null | undefined): SlotLayout | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const layout: SlotLayout = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entry = value as Record<string, unknown>
      if (typeof entry.topPct === 'number' && typeof entry.leftPct === 'number') {
        layout[key] = { topPct: entry.topPct, leftPct: entry.leftPct }
      }
    }
  }
  return Object.keys(layout).length > 0 ? layout : null
}

type LeagueCallUp = {
  playerId: string
  slotKey: string | null
  player: PlayerNameSource & {
    teamId: string | null
  }
}

type FriendlyParticipation = {
  playerId: string
  side: 'A' | 'B'
  slotKey: string | null
  player: PlayerNameSource & {
    person: { photoMimeType: string | null }
  }
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
  if (!formation) return { key: teamId, label, slotLayout: null, lineup: null }

  const teamCallUps = callUps.filter((c) => c.player.teamId === teamId)
  const scheme = normalizeSchemeForFormat(formation.scheme, footballFormat)
  const slotLayout = parseSlotLayout(formation.slotLayout)
  return {
    key: teamId,
    label,
    slotLayout,
    lineup: buildLineupView({
      scheme,
      footballFormat,
      slotLayout,
      assignments: teamCallUps
        .filter((c) => c.slotKey)
        .map((c) => ({
          slotKey: c.slotKey!,
          playerId: c.playerId,
          playerName: playerDisplayName(c.player),
        })),
      bench: teamCallUps
        .filter((c) => !c.slotKey)
        .map((c) => ({ playerId: c.playerId, playerName: playerDisplayName(c.player) })),
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
  if (!formation) return { key: side, label, slotLayout: null, lineup: null }

  const sideParts = participations.filter((p) => p.side === side)
  const scheme = normalizeSchemeForFormat(formation.scheme, footballFormat)
  const slotLayout = parseSlotLayout(formation.slotLayout)
  return {
    key: side,
    label,
    slotLayout,
    lineup: buildLineupView({
      scheme,
      footballFormat,
      slotLayout,
      assignments: sideParts
        .filter((p) => p.slotKey)
        .map((p) => ({
          slotKey: p.slotKey!,
          playerId: p.playerId,
          playerName: playerDisplayName(p.player),
          playerPhotoUrl: p.player.person.photoMimeType
            ? friendlyPlayerPhotoUrl(p.playerId)
            : null,
        })),
      bench: sideParts
        .filter((p) => !p.slotKey)
        .map((p) => ({
          playerId: p.playerId,
          playerName: playerDisplayName(p.player),
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
