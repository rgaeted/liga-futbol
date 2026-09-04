'use client'

import type { PlayerAwardBadge } from '@/lib/player-awards'

export function AwardChip({ badge }: { badge: PlayerAwardBadge }) {
  const titleParts = [badge.name]
  if (badge.description) titleParts.push(badge.description)
  if (badge.note) titleParts.push(badge.note)

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-kelme-border bg-kelme-surface px-2.5 py-1 text-sm font-semibold"
      style={
        badge.accentColor
          ? {
              borderColor: badge.accentColor,
              backgroundColor: `${badge.accentColor}22`,
              color: badge.accentColor,
            }
          : undefined
      }
      title={titleParts.join(' · ')}
    >
      <span aria-hidden>{badge.emoji}</span>
      {badge.label}
    </span>
  )
}

export function PlayerAwardBadges({
  general,
  bySeason,
}: {
  general: PlayerAwardBadge[]
  bySeason: { seasonName: string; awards: PlayerAwardBadge[] }[]
}) {
  if (general.length === 0 && bySeason.length === 0) {
    return <p className="text-sm text-kelme-gray-400">Aún no tienes premios en esta liga.</p>
  }

  return (
    <div className="space-y-4">
      {general.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {general.map((badge) => (
            <AwardChip key={badge.id} badge={badge} />
          ))}
        </div>
      )}
      {bySeason.map((group) => (
        <div key={group.seasonName}>
          <h3 className="mb-2 text-sm font-medium text-kelme-gray-400">{group.seasonName}</h3>
          <div className="flex flex-wrap gap-2">
            {group.awards.map((badge) => (
              <AwardChip key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
