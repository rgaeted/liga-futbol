import type { FriendlySide } from '@prisma/client'

export type PlayerMatchResults = {
  won: number
  drawn: number
  lost: number
}

type FinishedMatchScores = {
  status: string
  homeScore: number
  awayScore: number
}

type LeagueCallUpInput = {
  match: FinishedMatchScores & {
    homeTeamId: string | null
    awayTeamId: string | null
  }
}

type FriendlyParticipationInput = {
  side: FriendlySide
  match: FinishedMatchScores
}

function outcomeFromScores(playerScore: number, opponentScore: number): keyof PlayerMatchResults {
  if (playerScore > opponentScore) return 'won'
  if (playerScore < opponentScore) return 'lost'
  return 'drawn'
}

function leagueScores(
  match: LeagueCallUpInput['match'],
  playerTeamId: string | null,
): { playerScore: number; opponentScore: number } | null {
  if (!playerTeamId) return null
  if (playerTeamId === match.homeTeamId) {
    return { playerScore: match.homeScore, opponentScore: match.awayScore }
  }
  if (playerTeamId === match.awayTeamId) {
    return { playerScore: match.awayScore, opponentScore: match.homeScore }
  }
  return null
}

function friendlyScores(
  side: FriendlySide,
  match: FinishedMatchScores,
): { playerScore: number; opponentScore: number } {
  if (side === 'A') {
    return { playerScore: match.homeScore, opponentScore: match.awayScore }
  }
  return { playerScore: match.awayScore, opponentScore: match.homeScore }
}

export function computePlayerMatchResults(input: {
  leagueCallUps: LeagueCallUpInput[]
  friendlyParticipations: FriendlyParticipationInput[]
  playerTeamId: string | null
}): PlayerMatchResults {
  const results: PlayerMatchResults = { won: 0, drawn: 0, lost: 0 }

  for (const { match } of input.leagueCallUps) {
    if (match.status !== 'FINISHED') continue
    const scores = leagueScores(match, input.playerTeamId)
    if (!scores) continue
    results[outcomeFromScores(scores.playerScore, scores.opponentScore)] += 1
  }

  for (const { side, match } of input.friendlyParticipations) {
    if (match.status !== 'FINISHED') continue
    const scores = friendlyScores(side, match)
    results[outcomeFromScores(scores.playerScore, scores.opponentScore)] += 1
  }

  return results
}
