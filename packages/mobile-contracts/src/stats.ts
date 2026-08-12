export type MobilePlayerStatsDto = {
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  mvpCount: number
}

export type MobileStatRow = {
  rosterEntryId: string
  playerId: string
  playerName: string
  teamName: string
  jerseyNumber: number | null
  position: string | null
  value: number
  stats: MobilePlayerStatsDto
}

export type MobileStatsResponse = {
  scorers: MobileStatRow[]
  assists: MobileStatRow[]
  yellowCards: MobileStatRow[]
  redCards: MobileStatRow[]
  mvps: MobileStatRow[]
}
