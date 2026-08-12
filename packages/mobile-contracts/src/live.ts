import type { MatchStatusCode, MobileTeamRef } from './common.js'

export type MobileLiveClock = {
  status: MatchStatusCode
  clockStartedAt: string | null
  secondHalfStartedAt: string | null
  halftimeAt: string | null
}

export type MobileLiveEvent = {
  id: string
  type: string
  minute: number
  createdAt: string
  playerName: string | null
  assistName: string | null
  description: string | null
  teamName: string | null
  teamCrestUrl: string | null
  teamColor: string | null
}

export type MobileLiveSnapshot = {
  id: string
  status: MatchStatusCode
  home: MobileTeamRef
  away: MobileTeamRef
  homeScore: number
  awayScore: number
  clock: MobileLiveClock
  events: MobileLiveEvent[]
  venue: string | null
  locationLabel: string | null
  weather: {
    label: string
    tempC: number
    humidityPct: number
    windKmh: number
  } | null
}
