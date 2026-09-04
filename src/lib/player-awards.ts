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
