'use client'

import type { PlayerAwardBadge } from '@/lib/player-awards'

function AwardCard({ badge }: { badge: PlayerAwardBadge }) {
  const accent = badge.accentColor ?? '#C91F26'

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#2A3A32] bg-[#0B1210] p-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
        style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}44` }}
        aria-hidden
      >
        {badge.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#E8E4D8]">{badge.name}</p>
        {badge.description ? (
          <p className="mt-0.5 text-xs text-[#8A938C]">{badge.description}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-bold text-[#8A938C]">×1</span>
    </div>
  )
}

export function AwardChip({ badge }: { badge: PlayerAwardBadge }) {
  const titleParts = [badge.name]
  if (badge.description) titleParts.push(badge.description)
  if (badge.note) titleParts.push(badge.note)

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[#2A3A32] bg-[#0B1210] px-2.5 py-1 text-sm font-semibold text-[#E8E4D8]"
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
  variant = 'panel',
}: {
  general: PlayerAwardBadge[]
  bySeason: { seasonName: string; awards: PlayerAwardBadge[] }[]
  variant?: 'panel' | 'chips'
}) {
  const allAwards = [
    ...general,
    ...bySeason.flatMap((group) => group.awards),
  ]

  if (allAwards.length === 0) {
    return <p className="text-sm text-[#8A938C]">Aún no tienes premios en esta liga.</p>
  }

  if (variant === 'chips') {
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
            <h3 className="mb-2 text-sm font-medium text-[#8A938C]">{group.seasonName}</h3>
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

  return (
    <div className="space-y-2">
      {allAwards.map((badge) => (
        <AwardCard key={badge.id} badge={badge} />
      ))}
    </div>
  )
}
