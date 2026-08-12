export type MatchStatusCode =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALFTIME'
  | 'FINISHED'
  | 'CANCELLED'

export type MobileTeamRef = {
  seasonTeamId: string
  teamId: string
  name: string
  color: string
  crestUrl: string | null
  initials: string
}

export type MobilePaginated<T> = {
  items: T[]
  nextCursor: string | null
}
