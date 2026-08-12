import type { MatchStatusCode, MobileTeamRef } from './common.js'

export type MobileMatchSummary = {
  id: string
  scheduledAt: string
  status: MatchStatusCode
  statusLabel: string
  home: MobileTeamRef
  away: MobileTeamRef
  homeScore: number
  awayScore: number
  venue: string | null
  locationLabel: string | null
}

export type MobileMatchDetail = MobileMatchSummary & {
  footballFormat: string
  weather: {
    label: string
    tempC: number
    humidityPct: number
    windKmh: number
  } | null
}
