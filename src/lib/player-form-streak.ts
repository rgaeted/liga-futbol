import type { FriendlySide } from '@prisma/client'
import type { PlayerMatchResults } from '@/lib/player-match-results'

export type FormResult = 'W' | 'D' | 'L'

type FinishedMatch = {
  scheduledAt: Date
  status: string
  homeScore: number
  awayScore: number
}

type LeagueRow = {
  match: FinishedMatch & { homeTeamId: string | null; awayTeamId: string | null }
}

type FriendlyRow = {
  side: FriendlySide | null
  match: FinishedMatch
}

function outcome(
  playerScore: number,
  opponentScore: number,
): FormResult {
  if (playerScore > opponentScore) return 'W'
  if (playerScore < opponentScore) return 'L'
  return 'D'
}

function leagueOutcome(
  match: LeagueRow['match'],
  playerTeamId: string | null,
): FormResult | null {
  if (!playerTeamId) return null
  if (playerTeamId === match.homeTeamId) {
    return outcome(match.homeScore, match.awayScore)
  }
  if (playerTeamId === match.awayTeamId) {
    return outcome(match.awayScore, match.homeScore)
  }
  return null
}

function friendlyOutcome(side: FriendlySide, match: FinishedMatch): FormResult {
  const playerScore = side === 'A' ? match.homeScore : match.awayScore
  const opponentScore = side === 'A' ? match.awayScore : match.homeScore
  return outcome(playerScore, opponentScore)
}

export function computePlayerFormStreak(input: {
  leagueCallUps: LeagueRow[]
  friendlyParticipations: FriendlyRow[]
  playerTeamId: string | null
  limit?: number
}): FormResult[] {
  const limit = input.limit ?? 5
  const rows: Array<{ at: number; result: FormResult }> = []

  for (const { match } of input.leagueCallUps) {
    if (match.status !== 'FINISHED') continue
    const result = leagueOutcome(match, input.playerTeamId)
    if (!result) continue
    rows.push({ at: match.scheduledAt.getTime(), result })
  }

  for (const { side, match } of input.friendlyParticipations) {
    if (match.status !== 'FINISHED' || side == null) continue
    rows.push({ at: match.scheduledAt.getTime(), result: friendlyOutcome(side, match) })
  }

  return rows
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((row) => row.result)
    .reverse()
}

export function countPlayedMatches(results: PlayerMatchResults): number {
  return results.won + results.drawn + results.lost
}
