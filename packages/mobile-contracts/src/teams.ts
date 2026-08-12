import type { MobileMatchSummary } from './match.js'
import type { MobilePlayerStatsDto } from './stats.js'
import type { MobileTeamRef } from './common.js'

export type MobileTeamListItem = MobileTeamRef & {
  nextMatchAt: string | null
}

export type MobileRosterPlayer = {
  rosterEntryId: string
  playerId: string
  name: string
  jerseyNumber: number | null
  position: string | null
  stats: MobilePlayerStatsDto
}

export type MobileTeamDetail = MobileTeamRef & {
  roster: MobileRosterPlayer[]
  upcomingMatches: MobileMatchSummary[]
  recentResults: MobileMatchSummary[]
}

export type MobilePlayerDetail = {
  rosterEntryId: string
  playerId: string
  name: string
  teamName: string
  seasonTeamId: string
  jerseyNumber: number | null
  position: string | null
  stats: MobilePlayerStatsDto
}
