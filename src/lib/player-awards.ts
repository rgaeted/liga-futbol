export type PlayerAwardBadge = {
  id: string
  label: string
  emoji: string
  name: string
  description: string | null
  accentColor: string | null
  note: string | null
  awardedAt: string
  seasonId: string | null
  seasonName: string | null
}

type AwardRow = {
  id: string
  awardedAt: Date
  note: string | null
  season: { id: string; name: string } | null
  orgAward: {
    id: string
    name: string
    shortLabel: string
    emoji: string
    description: string | null
    accentColor: string | null
    isActive: boolean
  }
}

export function serializePlayerAwardBadge(row: AwardRow): PlayerAwardBadge {
  return {
    id: row.id,
    label: row.orgAward.shortLabel,
    emoji: row.orgAward.emoji,
    name: row.orgAward.name,
    description: row.orgAward.description,
    accentColor: row.orgAward.accentColor,
    note: row.note,
    awardedAt: row.awardedAt.toISOString(),
    seasonId: row.season?.id ?? null,
    seasonName: row.season?.name ?? null,
  }
}

export function groupPlayerAwardsBySeason<
  T extends { seasonId: string | null; seasonName: string | null; badge: PlayerAwardBadge },
>(items: T[]) {
  const general = items.filter((item) => item.seasonId === null)
  const bySeasonMap = new Map<string, T[]>()
  for (const item of items) {
    if (!item.seasonId) continue
    const bucket = bySeasonMap.get(item.seasonId) ?? []
    bucket.push(item)
    bySeasonMap.set(item.seasonId, bucket)
  }
  const bySeason = [...bySeasonMap.entries()].map(([seasonId, awards]) => ({
    seasonId,
    seasonName: awards[0]?.seasonName ?? '',
    awards,
  }))
  return { general, bySeason }
}

export type AwardLeaderRow = {
  playerId: string
  name: string
  value: number
  meta: string
}

export function tallyPlayerAwardRankings(
  grants: Array<{
    playerId: string
    playerName: string
    awardEmoji: string
    awardShortLabel: string
  }>,
  take = 8,
): AwardLeaderRow[] {
  const map = new Map<string, { name: string; value: number; labels: Set<string> }>()
  for (const grant of grants) {
    const current = map.get(grant.playerId) ?? {
      name: grant.playerName,
      value: 0,
      labels: new Set<string>(),
    }
    current.value += 1
    current.labels.add(`${grant.awardEmoji} ${grant.awardShortLabel}`)
    if (grant.playerName) current.name = grant.playerName
    map.set(grant.playerId, current)
  }
  return [...map.entries()]
    .map(([playerId, row]) => ({
      playerId,
      name: row.name,
      value: row.value,
      meta: [...row.labels].slice(0, 3).join(', '),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}
