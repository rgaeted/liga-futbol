export type ParticipationScoreFields = {
  paid: boolean
  isGalleta: boolean
  isCaptain: boolean
  isCoach: boolean
}

export function participationScore(r: ParticipationScoreFields): number {
  return (
    Number(r.isCaptain) * 8 +
    Number(r.isCoach) * 4 +
    Number(r.paid) * 2 +
    Number(r.isGalleta)
  )
}

export function pickParticipationWinner<T extends ParticipationScoreFields>(rows: T[]): T {
  if (rows.length === 0) {
    throw new Error('pickParticipationWinner requires at least one row')
  }
  return [...rows].sort((a, b) => participationScore(b) - participationScore(a))[0]
}

export function participationGroupKey(matchId: string, playerId: string): string {
  return `${matchId}:${playerId}`
}

export function groupParticipationsByMatchPlayer<
  T extends { matchId: string; playerId: string | null },
>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    if (!row.playerId) continue
    const key = participationGroupKey(row.matchId, row.playerId)
    const bucket = groups.get(key) ?? []
    bucket.push(row)
    groups.set(key, bucket)
  }
  return groups
}

export function duplicateParticipationGroups<
  T extends { matchId: string; playerId: string | null },
>(rows: T[]): Map<string, T[]> {
  const groups = groupParticipationsByMatchPlayer(rows)
  const duplicates = new Map<string, T[]>()
  for (const [key, bucket] of groups) {
    if (bucket.length > 1) duplicates.set(key, bucket)
  }
  return duplicates
}
