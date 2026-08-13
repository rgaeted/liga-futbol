import type { NotificationKind } from '@prisma/client'

export type BuildNotificationDedupeKeyInput = {
  seasonId: string
  matchId: string
  kind: NotificationKind
  matchEventId?: string | null
}

export type LeagueMatchTeams = {
  homeTeamId: string | null
  awayTeamId: string | null
  homeSeasonTeamId: string | null
  awaySeasonTeamId: string | null
}

export type ScoringEventInput = {
  type: 'GOAL' | 'OWN_GOAL'
  teamId: string | null
}

export type MatchNotificationContext = {
  slug: string
  matchId: string
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  scorerName?: string | null
}

export type MatchNotificationPayload = {
  title: string
  body: string
  data: {
    type: 'match'
    slug: string
    matchId: string
    kind: 'MATCH_START' | 'GOAL' | 'MATCH_FINISH'
    path: string
  }
}
