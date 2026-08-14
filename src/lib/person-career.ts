import { EventType, MatchType } from '@prisma/client'

export type CareerBucket = {
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  mvps: number
}

export type PersonCareer = {
  person: { id: string; firstName: string; lastName: string; hasAccount: boolean }
  league: CareerBucket
  friendly: CareerBucket
  total: CareerBucket
}

function emptyBucket(): CareerBucket {
  return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvps: 0 }
}

function add(a: CareerBucket, b: CareerBucket): CareerBucket {
  return {
    matches: a.matches + b.matches,
    goals: a.goals + b.goals,
    assists: a.assists + b.assists,
    yellowCards: a.yellowCards + b.yellowCards,
    redCards: a.redCards + b.redCards,
    mvps: a.mvps + b.mvps,
  }
}

export function buildPersonCareer(input: {
  person: { id: string; firstName: string; lastName: string; userId: string | null }
  leagueMatchIds: string[]
  friendlyMatchIds: string[]
  events: Array<{
    matchId: string
    matchType: MatchType
    type: EventType
    isAssist: boolean
  }>
  leagueMvpCount: number
  friendlyMvpCount: number
}): PersonCareer {
  const league = emptyBucket()
  const friendly = emptyBucket()
  league.matches = new Set(input.leagueMatchIds).size
  friendly.matches = new Set(input.friendlyMatchIds).size
  league.mvps = input.leagueMvpCount
  friendly.mvps = input.friendlyMvpCount

  for (const event of input.events) {
    const bucket = event.matchType === MatchType.FRIENDLY ? friendly : league
    if (event.isAssist) {
      bucket.assists += 1
      continue
    }
    if (event.type === EventType.GOAL) bucket.goals += 1
    if (event.type === EventType.YELLOW_CARD) bucket.yellowCards += 1
    if (event.type === EventType.RED_CARD) bucket.redCards += 1
  }

  return {
    person: {
      id: input.person.id,
      firstName: input.person.firstName,
      lastName: input.person.lastName,
      hasAccount: Boolean(input.person.userId),
    },
    league,
    friendly,
    total: add(league, friendly),
  }
}
